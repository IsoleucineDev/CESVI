"""Paso 3b: genera turnos en que el perito RESPONDE CON UN RELATO que cubre varios temas a la vez.
El modelo maestro redacta la pregunta, el relato y la extracción (valor + evidencia literal); el CÓDIGO descarta
todo ejemplo cuya evidencia no esté literalmente en el relato o cuyo valor no concuerde con ella.

Uso: python 03b_generate_narratives.py --work work --per-dialogue 2 --limit 20     (primero prueba con pocos)
Requiere el servidor del modelo maestro encendido (igual que el paso 3).
"""
import argparse
import json
import random
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import llm 
from facts_utils import _norm, _nums, _stems4, faithful, mentions_other_vehicle
from schema import SALTADO, format_vehiculos, parse_json_loose

STYLES = ["natural, 1-2 frases", "natural, 1-2 frases", "detallado, 2-3 frases técnicas",
          "informal de campo, con abreviaturas y sin tildes", "en MAYÚSCULAS como transcrito de un aviso de accidente"]
SYSTEM = "Simulas entrevistas entre un asistente de IA y un perito de tránsito. Respondes solo con JSON válido."


def prompt_for(d, asked, extras, style, order=None):
    fmt = lambda t: {"tema": t["id"], "descripcion": t["desc"], "valor_de_referencia": t["valor"]}
    chosen = {asked["id"]} | {t["id"] for t in extras}
    others = [p["id"] for p in d["plan"] if p["id"] not in chosen]
    return f"""Simula UN turno de entrevista. El ASISTENTE pregunta por el tema PRINCIPAL y el PERITO responde con un relato que, además, cuenta los OTROS temas de la lista.

CASO
- Modalidad: {d['modalidad']}
- Vehículos: {format_vehiculos(d['vehiculos'])}

PRINCIPAL: {json.dumps(fmt(asked), ensure_ascii=False)}
OTROS: {json.dumps([fmt(t) for t in extras], ensure_ascii=False)}

REGLAS DEL RELATO (se verifican automáticamente y el ejemplo se descarta si no se cumplen):
- Cada oración expresa EXACTAMENTE uno de los temas listados, con el contenido de su valor_de_referencia. NO añadas ningún detalle que no esté en esos valores (carril, huellas, marcas, velocidades, clima, daños, etc.).
- PROHIBIDO mencionar, ni siquiera insinuar, estos otros temas: {', '.join(others)}.
- Menciona los temas en este orden (por sus ids): {' → '.join(order or [asked['id']] + [t['id'] for t in extras])}.
- Mantén una oración por tema, sin oraciones de relleno; puedes enlazarlas con "además", "y", "luego".
- En la pregunta usa la descripción corta del vehículo (p. ej. "el Chevy"); no la formules con "V1"/"V2".

Devuelve SOLO este JSON:
{{"pregunta": "pregunta del asistente SOLO sobre el tema principal (tuteo, técnica; si el tema es de un vehículo, no menciones al otro)",
 "respuesta": "relato del perito, estilo {style}",
 "extracciones": [{{"tema": "id", "valor": "valor normalizado y breve (número sin unidades si el tema es numérico)", "evidencia": "fragmento COPIADO LITERALMENTE de tu 'respuesta' que expresa SOLO ese dato, dentro de UNA oración (mínimo 2 palabras, o con la cifra)"}}]}}
"extracciones" lleva exactamente un elemento por cada tema listado."""


GLUE = {"ademas", "tambien", "luego", "despues", "finalmente", "entonces", "asimismo", "segun"}


def sentences(text):
    return [s for s in re.split(r"(?<=[.!?;])\s+", text.strip()) if s.strip()]


def coverage_problem(resp, evidencias, veh):
    """None si el relato es 'limpio'; si no, el motivo. Cada evidencia debe estar dentro de UNA oración y casi todo el
    contenido de cada oración (salvo la descripción de los vehículos) debe quedar cubierto por alguna evidencia."""
    sents = sentences(resp)
    norm_s = [_norm(s) for s in sents]
    for e in evidencias:
        if not any(_norm(e) in ns for ns in norm_s):
            return "una evidencia abarca más de una oración"
    covered = set().union(*[_stems4(e) for e in evidencias]) if evidencias else set()
    skip = _stems4(" ".join(veh.values())) | {w[:5] for w in GLUE}
    for s in sents:
        st = _stems4(s) - skip
        if len(st) >= 2 and len(st & covered) / len(st) < 0.8:
            return f"oración con contenido no extraído: {s[:70]!r}"
    return None


def validate(out, asked, extras, veh):
    if not isinstance(out, dict):
        return None, "no es un objeto JSON"
    preg, resp = str(out.get("pregunta", "")).strip(), str(out.get("respuesta", "")).strip()
    if not preg or not resp or resp.lower().startswith("saltar"):
        return None, "pregunta/respuesta vacías"
    if mentions_other_vehicle(asked["id"], preg, veh):
        return None, "la pregunta menciona al otro vehículo"
    wanted = [asked["id"]] + [t["id"] for t in extras]
    ex = out.get("extracciones")
    if not isinstance(ex, list) or sorted(str(e.get("tema")) for e in ex if isinstance(e, dict)) != sorted(wanted):
        return None, "extracciones no coinciden con los temas pedidos"
    rn, gold = _norm(resp), {}
    for e in ex:
        v, ev = e.get("valor"), str(e.get("evidencia") or "")
        en = _norm(ev)
        if v is None or v == "" or isinstance(v, (bool, list, dict)):
            return None, f"valor vacío en {e['tema']}"
        if not en or en not in rn or not (len(en.split()) >= 2 or re.search(r"\d", en) or en == rn):
            return None, f"evidencia no literal en {e['tema']}"
        ok = (v in _nums(ev)) if isinstance(v, (int, float)) else faithful(v, ev)
        if not ok:
            return None, f"valor no concuerda con su evidencia en {e['tema']}"
        gold[e["tema"]] = {"valor": v, "evidencia": ev}
    why = coverage_problem(resp, [g["evidencia"] for g in gold.values()], veh)
    if why:
        return None, why
    return {"pregunta": preg, "respuesta": resp, "gold": gold}, None


# Valores SINTÉTICOS (escritos a mano) para temas que casi nunca aparecen en los reportes. Sirven solo para que el
# extractor aprenda a RECONOCER cómo se dicen; no son datos de ningún reporte y los archivos se marcan "sintetico".
SYNTH = {
    "iluminacion": ["de noche con alumbrado público", "de noche sin alumbrado", "de día con buena visibilidad",
                    "al amanecer con poca luz", "de noche con lluvia y poca visibilidad"],
    "vueltas_volcadura": ["una vuelta lateral hacia la derecha", "dos vueltas completas", "media vuelta y quedó sobre el techo",
                          "una vuelta y media hacia la izquierda"],
    "senalizacion_preferencia": ["semáforo en rojo para uno de los vehículos", "señal de alto sobre la vía secundaria",
                                 "señal de ceda el paso", "sin señalización en el cruce", "semáforo en verde con preferencia de paso"],
    "maniobra_reversa": ["reversa de unos 5 metros con poca visibilidad", "reversa saliendo de un estacionamiento sin espejo",
                         "reversa de 8 metros sobre la banqueta"],
    "danos_{V}": ["hundimiento frontal de 40 cm de alto con dirección de adelante hacia atrás",
                  "tallones laterales izquierdos de adelante hacia atrás", "deformación en el costado derecho a 55 cm de altura",
                  "ruptura de la fascia posterior"],
    "causa_perdida_control": ["derrape por pavimento mojado", "reventón de llanta delantera", "maniobra para esquivar un animal",
                              "distracción del conductor", "exceso de velocidad en curva"],
    "velocidad_{V}_kmh": [40, 50, 60, 70, 80, 90],
    "huellas_frenado_m": [8, 12, 15, 20, 25],
    "angulo_impacto": ["aproximadamente 90 grados", "unos 45 grados", "perpendicular", "unos 30 grados"],
    "altura_marca_objeto_cm": [30, 45, 65, 80],
    "tipo_objeto": ["poste de concreto de 30 cm de diámetro", "muro de contención de concreto", "barda de ladrillo",
                    "árbol de tronco grueso", "camellón con guarnición alta"],
}
_base = lambda tid: re.sub(r"V[1-3]", "{V}", tid)


def inject(plan, rng):
    """Copia del plan donde los temas raros SIN dato reciben un valor sintético."""
    out = []
    for p in plan:
        if p["valor"] == SALTADO and _base(p["id"]) in SYNTH:
            p = {**p, "valor": rng.choice(SYNTH[_base(p["id"])]), "sintetico": True}
        out.append(p)
    return out


def boost_slots(plan, rng, n):
    """n ranuras (g, extras) donde interviene un tema raro: como tema preguntado o como dato extra del relato."""
    rare = [i for i, p in enumerate(plan) if _base(p["id"]) in SYNTH]
    pos = {p["id"]: i for i, p in enumerate(plan)}
    slots = []
    for _ in range(n if rare else 0):
        r = rng.choice(rare)
        later = [p for p in plan[r + 1:] if p["valor"] != SALTADO]
        earlier = [i for i in range(r) if plan[i]["valor"] != SALTADO]
        if rng.random() < 0.5 or not earlier:              # el tema raro es el preguntado
            g, extras = r, rng.sample(later, min(len(later), rng.randint(0, 2)))
        else:                                              # el tema raro llega como dato extra del relato
            g = rng.choice(earlier)
            extras = [plan[r]] + rng.sample(later, min(len(later), rng.randint(0, 1)))
        slots.append((g, sorted(extras, key=lambda p: pos[p["id"]])))
    return slots


def try_slot(d, plan, g, extras, dest, rng, retries, rejdir, synthetic):
    order = [plan[g]["id"]] + [t["id"] for t in extras]
    if rng.random() < 0.5:
        rng.shuffle(order)  # el perito no siempre empieza por lo preguntado
    why, status = "sin intentos", None
    for attempt in range(retries):
        try:
            raw = llm.ask(SYSTEM, prompt_for(d, plan[g], extras, rng.choice(STYLES), order), max_tokens=1500)
        except RuntimeError as e:
            return f"error {dest.stem}: {e}"
        ex, why = validate(parse_json_loose(raw), plan[g], extras, d["vehiculos"])
        if ex:
            json.dump({"id": d["id"], "split": d["split"], "modalidad": d["modalidad"], "vehiculos": d["vehiculos"],
                       "plan": plan, "g": g, "asked": plan[g]["id"], "sintetico": synthetic, **ex},
                      open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            return "ok"
        json.dump({"motivo": why, "principal": plan[g], "otros": extras, "vehiculos": d["vehiculos"], "salida_cruda": raw},
                  open(rejdir / f"{dest.stem}__{attempt}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return f"invalido {dest.stem}: {why}"


def work_one(path, outdir, per, extras_max, retries, rejdir, boost):
    d = json.load(open(path, encoding="utf-8"))
    plan = d.get("plan")
    if not plan:
        return ["skip"]
    rng = random.Random(d["id"] + "narr")
    cand = [g for g in range(len(plan) - 1)
            if plan[g]["valor"] != SALTADO and any(p["valor"] != SALTADO for p in plan[g + 1:])]
    rng.shuffle(cand)
    res = []
    for n, g in enumerate(cand[:per]):
        dest = outdir / f"{d['id']}__{n}.json"
        if dest.exists():
            res.append("skip")
            continue
        later = [p for p in plan[g + 1:] if p["valor"] != SALTADO]
        extras = sorted(rng.sample(later, min(len(later), rng.randint(1, extras_max))), key=lambda p: plan.index(p))
        res.append(try_slot(d, plan, g, extras, dest, rng, retries, rejdir, False))
    if boost:  # relatos dirigidos a temas raros, con valores sintéticos
        brng = random.Random(d["id"] + "boost")
        bplan = inject(plan, brng)
        for k, (g, extras) in enumerate(boost_slots(bplan, brng, boost)):
            dest = outdir / f"{d['id']}__b{k}.json"
            if dest.exists():
                res.append("skip")
                continue
            res.append(try_slot(d, bplan, g, extras, dest, brng, retries, rejdir, True))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="work")
    ap.add_argument("--per-dialogue", type=int, default=2)
    ap.add_argument("--extras-max", type=int, default=3, help="máx. de temas adicionales por relato")
    ap.add_argument("--retries", type=int, default=2, help="intentos por relato antes de descartarlo")
    ap.add_argument("--boost", type=int, default=0, help="relatos SINTÉTICOS dirigidos a temas raros, por reporte")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    work = Path(a.work)
    outdir = work / "narratives"
    outdir.mkdir(exist_ok=True)
    rejdir = work / "narratives_rejected"
    rejdir.mkdir(exist_ok=True)
    paths = sorted((work / "dialogues").glob("*.json"))
    if a.limit:
        paths = paths[: a.limit]
    with ThreadPoolExecutor(1) as ex:
        res = [r for rs in ex.map(lambda p: work_one(p, outdir, a.per_dialogue, a.extras_max, a.retries, rejdir, a.boost), paths) for r in rs]
    ok = res.count("ok")
    print(f"ok={ok} skip={res.count('skip')} descartados={len(res) - ok - res.count('skip')}")
    for r in res:
        if r not in ("ok", "skip"):
            print(" ", r)


if __name__ == "__main__":
    main()