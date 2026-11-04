"""Paso 2: extrae los HECHOS de cada reporte (verdad de referencia) con un modelo maestro.

Cada valor debe venir con una CITA LITERAL del reporte; el código verifica que la cita exista en el texto.
Si no existe, el valor se descarta (null) y se guarda en "descartados" para que puedas revisarlo.

Salida (work/facts/<id>.json):
  {"modalidad", "vehiculos", "valores": {id: valor|null}, "citas": {id: cita}, "descartados": {id: valor}}

Uso: python 02_extract_facts.py --work work --limit 20
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import llm
from facts_utils import clean_values, grounded, normalize_numeric, postprocess, supported
from schema import MODALIDADES, TOPIC_CATALOG, known_topic_ids_regex, parse_json_loose, topics_for

VALID_ID = known_topic_ids_regex()
SYSTEM = ("Eres un perito en reconstrucción de hechos de tránsito que estructura dictámenes. "
          "Eres estricto: nunca afirmas nada que el reporte no diga textualmente. Respondes solo con JSON válido.")
MAX_CHARS = 20000


def shorten(text, max_chars=MAX_CHARS):
    if len(text) <= max_chars:
        return text
    head = int(max_chars * 0.4)
    return text[:head] + "\n\n[... fragmento omitido por longitud ...]\n\n" + text[-(max_chars - head):]


def catalog_text(topics=None):
    lines = []
    if topics is None:
        for t in TOPIC_CATALOG:
            mods = "todas" if t["mods"] == "*" else ", ".join(t["mods"])
            veh = " (uno por vehículo, con sufijo _V1, _V2...)" if t["veh"] else ""
            lines.append(f'- {t["id"]}{veh} | {t["desc"].replace("{V}", "el vehículo")} | modalidades: {mods}')
    else:
        lines = [f'- {t["id"]} | {t["desc"]}' for t in topics]
    return "\n".join(lines)


RULES = """REGLAS ESTRICTAS:
- Cada valor va como {"valor": ..., "cita": "..."}. La "cita" es un fragmento LITERAL del reporte (8 a 30 palabras), copiado EXACTAMENTE, que respalda el valor. Si no puedes citar un fragmento literal que lo respalde, el valor es null.
- NO INFIERAS. No deduzcas iluminación a partir de la hora, ni superficie, semáforos, preferencia de paso, ángulos, airbags, sentidos de circulación o velocidades si el reporte no lo dice con esas palabras. "Ninguno" o "no se observan" solo si el reporte lo dice.
- declaracion_{V}: valor = cita = el texto LITERAL que el reporte transcribe como declaración de ese conductor (suele ir entre comillas). Si no transcribe declaración de ese conductor: null.
- evidencias_sitio / intercambio de pintura: indica QUÉ vehículo presenta pintura de QUÉ color y cuál NO la presenta. No inviertas el sentido.
- danos_{V}: SOLO lo principal, máx. 40 palabras (zonas dañadas, dirección y altura del daño principal); cita un fragmento de la sección de daños de ese vehículo.
- La cita debe ser la oración que AFIRMA el dato, no cualquier oración cercana. Si el dato solo se deduce (p. ej. de la hora, o de otro dato), es null.
- Si el reporte transcribe una sola declaración, asígnala solo al conductor al que pertenece; el otro es null.
- Temas numéricos (velocidad_*_kmh, huellas_frenado_m, altura_marca_objeto_cm): número sin unidades (o texto "45-73" si es rango).
- Valores de texto: breve (máx. 25 palabras), en español. Llama a los vehículos V1, V2.
- Los pies de "Imagen N" del reporte NARRAN LA DINÁMICA del hecho (posición inicial, maniobras, punto de impacto, posiciones finales): úsalos para maniobra_previa_*, sentido_carril_*, secuencia_eventos y posicion_final_*, citando la frase del pie.
- Si un vehículo es "desconocido" y el reporte no describe sus daños ni su declaración, danos_{V} y declaracion_{V} de ese vehículo son null.
- Si no hay dato: null (el valor JSON null; nunca escribas "No se menciona", "N/A" ni "null" entre comillas).
- Incluye TODOS los ids aplicables (expandidos por vehículo), con null cuando no haya dato."""


def prompt_main(report):
    mods = "\n".join(f"- {k}: {v}" for k, v in MODALIDADES.items())
    return f"""Lee el siguiente dictamen/informe técnico y extrae los hechos en JSON.

MODALIDADES POSIBLES (elige una):
{mods}

CATÁLOGO DE TEMAS (ids exactos; los que dicen "por vehículo" se expanden como _V1, _V2):
{catalog_text()}

"vehiculos": {{"V1": "Marca Tipo Año color", ...}} en formato CORTO, sin placas ni VIN, p. ej. "Ford Fiesta 2001 negro" (V1 = vehículo del asegurado/estudio o el primero descrito; máx. 3).
Si la modalidad es "otro", devuelve "valores": {{}}.

{RULES}

Devuelve SOLO este JSON:
{{"modalidad": "...", "vehiculos": {{...}}, "valores": {{"<id>": {{"valor": ..., "cita": "..."}} | null, ...}}}}

=== REPORTE ===
{shorten(report['text'])}"""


def prompt_missing(report, topics):
    return f"""Del siguiente reporte, extrae SOLO estos temas que faltaron. Si el reporte no dice nada, pon null.

TEMAS:
{catalog_text(topics)}

{RULES}

Devuelve SOLO un JSON: {{"<id>": {{"valor": ..., "cita": "..."}} | null, ...}}

=== REPORTE ===
{shorten(report['text'])}"""


def process(raw, text, expected):
    """Verifica citas. Devuelve (valores, citas, descartados, malos)."""
    vals, citas, desc, bad = {}, {}, {}, 0
    for k, e in (raw or {}).items():
        if k not in expected:
            continue
        if e is None:
            vals[k] = None
        elif isinstance(e, dict) and "valor" in e:
            v, c = e.get("valor"), str(e.get("cita") or "")
            if v is None or (isinstance(v, str) and not v.strip()):
                vals[k] = None
            elif grounded(c, text) and supported(k, v, c):
                vals[k], citas[k] = v, c
            else:
                vals[k], desc[k] = None, v
        else:
            vals[k], bad = None, bad + 1  # el modelo ignoró el formato
    return vals, citas, desc, bad


def work_one(path, outdir):
    rep = json.load(open(path, encoding="utf-8"))
    dest = outdir / f"{rep['id']}.json"
    if dest.exists():
        return "skip"
    try:
        data = parse_json_loose(llm.ask(SYSTEM, prompt_main(rep), max_tokens=4000))
    except RuntimeError as e:
        return f"error {rep['id']}: {e}"
    if not isinstance(data, dict) or data.get("modalidad") not in MODALIDADES:
        return f"invalido {rep['id']}: modalidad/estructura"
    veh = data.get("vehiculos") or {}
    if not isinstance(veh, dict) or not veh:
        return f"invalido {rep['id']}: sin vehículos"
    veh = dict(list(veh.items())[:3])
    mod = data["modalidad"]
    topics = topics_for(mod, veh) if mod != "otro" else []
    expected = {t["id"] for t in topics}
    raw = data.get("valores") or {}
    vals, citas, desc, bad = process(raw, rep["text"], expected)
    if expected and bad > len(raw) / 2:
        return f"invalido {rep['id']}: el modelo no usó el formato valor/cita"
    missing = [t for t in topics if t["id"] not in vals]
    if missing:  # segunda pasada solo con lo que el modelo omitió
        try:
            r2 = parse_json_loose(llm.ask(SYSTEM, prompt_missing(rep, missing), max_tokens=2500))
            if isinstance(r2, dict):
                v2, c2, d2, _ = process(r2, rep["text"], expected)
                vals.update({k: v for k, v in v2.items() if k not in vals})
                citas.update(c2)
                desc.update(d2)
        except RuntimeError:
            pass
    for t in topics:
        vals.setdefault(t["id"], None)
    vals, _ = postprocess(vals, citas)
    vals, _ = clean_values(vals, rep["text"])
    vals = {k: normalize_numeric(k, v) for k, v in vals.items()}
    json.dump({"id": rep["id"], "split": rep["split"], "modalidad": mod, "vehiculos": veh,
               "valores": vals, "citas": {k: c for k, c in citas.items() if vals.get(k) is not None},
               "descartados": desc},
              open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="work")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--only", nargs="*", default=[], help="procesar solo ids que contengan alguno de estos textos")
    a = ap.parse_args()
    work = Path(a.work)
    outdir = work / "facts"
    outdir.mkdir(exist_ok=True)
    paths = sorted((work / "reports").glob("*.json"))
    if a.only:
        paths = [p for p in paths if any(s in p.stem for s in a.only)]
    if a.limit:
        paths = paths[: a.limit]
    with ThreadPoolExecutor(a.workers) as ex:
        res = list(ex.map(lambda p: work_one(p, outdir), paths))
    ok = res.count("ok")
    print(f"ok={ok} skip={res.count('skip')} problemas={len(res) - ok - res.count('skip')}")
    for r in res:
        if r not in ("ok", "skip"):
            print(" ", r)


if __name__ == "__main__":
    main()