"""Paso 3: genera entrevistas simuladas (asistente pregunta / perito responde) a partir de los hechos.

CAMBIO IMPORTANTE (más rápido y robusto): ya NO se genera la entrevista completa (~25 turnos) por reporte.
Se genera solo una VENTANA de --window turnos (por defecto 6) elegida al azar (inicio, final o intermedia).
El estado previo y los pendientes de los demás temas salen de los hechos (verdad de referencia), así que el
paso 4 puede reconstruir el contexto completo sin necesidad de redactar todos los turnos.

- El ORDEN y los TEMAS los decide el código (checklist); el modelo solo redacta pregunta y respuesta.
- Si el reporte no dice el dato (null), el perito responde "saltar".
- En ~60% de los casos se simula que el formulario ya trae daños y posición final.

Uso: python 03_generate_dialogues.py --work work --limit 60 --window 6
"""
import argparse
import json
import random
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import llm
from facts_utils import mentions_other_vehicle
from schema import SALTADO, format_vehiculos, parse_json_loose, topics_for

STYLES = [
    "breve (una frase)", "breve (una frase)", "breve (una frase)",
    "detallada (2-3 frases con precisión técnica)",
    "informal, con abreviaturas de campo (aprox., c/, m, km/h)",
    "con una duda o aproximación ('creo que', 'más o menos')",
]
SKIP_PHRASES = ["saltar"] * 6 + ["saltar, no tengo ese dato", "no hay ese dato", "no se tiene ese dato", "sin información", "desconozco"]
SYSTEM = "Simulas entrevistas entre un asistente de IA y un perito de tránsito. Respondes solo con JSON válido."


def plan_for(facts, rng):
    prefill = rng.random() < 0.6
    form, plan = {}, []
    for t in topics_for(facts["modalidad"], facts["vehiculos"]):
        truth = facts["valores"].get(t["id"])
        if t["source"] == "form" and prefill:
            if truth is not None:
                form[t["id"]] = truth
            continue
        plan.append({**t, "truth": truth, "style": rng.choice(STYLES)})
    return form, plan


def prompt_for(facts, form, sub, prior):
    items = [{"n": i, "tema": t["id"], "descripcion": t["desc"],
              "valor_verdadero": t["truth"], "estilo_respuesta": t["style"]} for i, t in enumerate(sub, 1)]
    return f"""Simula un tramo de una entrevista. El ASISTENTE (IA) entrevista a un PERITO que ya revisó el sitio y los vehículos.

CASO
- Modalidad: {facts['modalidad']}
- Vehículos: {format_vehiculos(facts['vehiculos'])}
- El formulario ya trae (NO preguntar): {json.dumps(form, ensure_ascii=False) if form else 'nada'}
- Ya se habló antes de (puedes enlazar con ello): {json.dumps(prior, ensure_ascii=False) if prior else 'nada, es el inicio'}

Para cada tema de la lista, EN ESE ORDEN, escribe:
- "pregunta": UNA pregunta natural y técnica del asistente (tuteo). Menciona el vehículo por su descripción corta cuando aplique. No reveles el valor verdadero. Varía la redacción. En temas de un vehículo (ids con _V1, _V2...) pregunta SOLO por ESE vehículo: no menciones al otro.
- "respuesta": lo que responde el perito, en el estilo indicado, con las cifras exactas del valor_verdadero y sin añadir datos nuevos. Si valor_verdadero es null, escribe "saltar".

TEMAS:
{json.dumps(items, ensure_ascii=False, indent=1)}

Devuelve SOLO un arreglo JSON de {len(sub)} elementos: [{{"tema": "...", "pregunta": "...", "respuesta": "..."}}]"""


def work_one(path, outdir, window):
    facts = json.load(open(path, encoding="utf-8"))
    dest = outdir / path.name
    if dest.exists() or facts["modalidad"] == "otro" or not facts["valores"]:
        return "skip"
    rng = random.Random(facts["id"])
    form, plan = plan_for(facts, rng)
    n = len(plan)
    if n < 5:
        return "skip"
    w = min(window, n)
    start = rng.choice([0, n - w, rng.randrange(0, n - w + 1)]) if n > w else 0
    sub = plan[start:start + w]
    prior = {t["id"]: t["truth"] for t in plan[:start] if t["truth"] is not None}
    try:
        out = parse_json_loose(llm.ask(SYSTEM, prompt_for(facts, form, sub, prior), max_tokens=2500))
    except RuntimeError as e:
        return f"error {facts['id']}: {e}"
    if not isinstance(out, list):
        return f"invalido {facts['id']}: no devolvió una lista JSON"
    by_tema = {o.get("tema"): o for o in out if isinstance(o, dict)}  # tolera desorden
    turns = []
    for t in sub:
        o = by_tema.get(t["id"])
        if not o or not str(o.get("pregunta", "")).strip():
            return f"invalido {facts['id']}: falta el tema {t['id']}"
        if mentions_other_vehicle(t["id"], str(o["pregunta"]), facts["vehiculos"]):
            return f"invalido {facts['id']}: la pregunta de {t['id']} menciona al otro vehículo"
        if t["truth"] is None:
            resp, val = rng.choice(SKIP_PHRASES), SALTADO
        else:
            resp, val = str(o.get("respuesta", "")).strip(), t["truth"]
            if not resp or resp.lower().startswith("saltar"):
                return f"invalido {facts['id']}: respuesta vacía/saltar en {t['id']}"
        turns.append({"tema": t["id"], "desc": t["desc"], "pregunta": str(o["pregunta"]).strip(),
                      "respuesta": resp, "valor": val})
    full_plan = [{"id": t["id"], "desc": t["desc"], "valor": SALTADO if t["truth"] is None else t["truth"]}
                 for t in plan]
    json.dump({"id": facts["id"], "split": facts["split"], "modalidad": facts["modalidad"],
               "vehiculos": facts["vehiculos"], "form": form, "plan": full_plan, "start": start, "turns": turns},
              open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="work")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--window", type=int, default=6, help="turnos a redactar por reporte")
    a = ap.parse_args()
    work = Path(a.work)
    outdir = work / "dialogues"
    outdir.mkdir(exist_ok=True)
    paths = sorted((work / "facts").glob("*.json"))
    if a.limit:
        paths = paths[: a.limit]
    with ThreadPoolExecutor(a.workers) as ex:
        res = list(ex.map(lambda p: work_one(p, outdir, a.window), paths))
    print(f"ok={res.count('ok')} skip={res.count('skip')} problemas={len(res) - res.count('ok') - res.count('skip')}")
    for r in res:
        if r not in ("ok", "skip"):
            print(" ", r)


if __name__ == "__main__":
    main()