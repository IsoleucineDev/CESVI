"""Paso 4: convierte entrevistas y relatos en ejemplos de entrenamiento (formato chat de mlx_lm).

Tareas del modelo:
  Q  (pregunta):  estado + pendientes + último intercambio  ->  "TEMA: id / PREGUNTA: ..."   (o TEMA: FIN)
  E2 (extracción multi-campo): pendientes + pregunta + respuesta -> {"id": {"valor", "evidencia"}} de TODOS los
      temas pendientes que la respuesta menciona (respuestas de un solo tema + relatos de varios temas).

El split se toma de work/reports (POR REPORTE). Si valid queda corto, se mueven reportes completos de train.

Uso: python 04_build_dataset.py --work work --out data
"""
import argparse
import hashlib
import json
import random
from collections import defaultdict
from pathlib import Path

from schema import (FIN_TEXT, SALTADO, SYSTEM_E2, SYSTEM_Q, build_e2_user, build_q_assistant, build_q_user)


def msgs(system, user, assistant):
    return {"messages": [{"role": "system", "content": system}, {"role": "user", "content": user},
                         {"role": "assistant", "content": assistant}]}


def get_plan(d):
    """Plan completo y posición de inicio de la ventana (compatible con diálogos sin 'plan')."""
    plan = d.get("plan") or [{"id": t["tema"], "desc": t["desc"], "valor": t["valor"]} for t in d["turns"]]
    return plan, d.get("start", 0)


def q_example(d, j, rng=None, hole_prob=0.4):
    """Pregunta para el turno j de la ventana (j == len(turns): siguiente tema, o FIN).
    Con prob. hole_prob se simula que 1-3 temas POSTERIORES ya fueron llenados por un relato anterior."""
    plan, start = get_plan(d)
    turns, g = d["turns"], start + j
    estado = {p["id"]: p["valor"] for p in plan[:g]}
    rest = plan[g:]
    if rng and j < len(turns) and rng.random() < hole_prob:
        later = [p for p in plan[g + 1:] if p["valor"] != SALTADO]
        if later:
            holes = rng.sample(later, min(len(later), rng.randint(1, 3)))
            ids = {p["id"] for p in holes}
            estado.update({p["id"]: p["valor"] for p in holes})
            rest = [p for p in rest if p["id"] not in ids]
    pend = [{"id": p["id"], "desc": p["desc"]} for p in rest]
    last = (turns[j - 1]["pregunta"], turns[j - 1]["respuesta"]) if j > 0 else None
    user = build_q_user(d["modalidad"], d["vehiculos"], d["form"], estado, pend, last)
    if g >= len(plan):
        return msgs(SYSTEM_Q, user, build_q_assistant("FIN", FIN_TEXT))
    return msgs(SYSTEM_Q, user, build_q_assistant(turns[j]["tema"], turns[j]["pregunta"]))


def q_candidates(d):
    plan, start = get_plan(d)
    n = len(d["turns"])
    return [j for j in range(n) if not (j == 0 and start > 0)], (start + n >= len(plan))


def e2_single(d, j):
    """Respuesta de un solo tema: la evidencia es la propia respuesta."""
    plan, start = get_plan(d)
    t = d["turns"][j]
    pend = [{"id": p["id"], "desc": p["desc"]} for p in plan[start + j:]]
    user = build_e2_user(d["modalidad"], d["vehiculos"], pend, t["pregunta"], t["respuesta"], t["tema"])
    gold = {t["tema"]: {"valor": t["valor"], "evidencia": t["respuesta"]}}
    return msgs(SYSTEM_E2, user, json.dumps(gold, ensure_ascii=False))


def e2_narrative(n):
    pend = [{"id": p["id"], "desc": p["desc"]} for p in n["plan"][n["g"]:]]
    user = build_e2_user(n["modalidad"], n["vehiculos"], pend, n["pregunta"], n["respuesta"], n["asked"])
    return msgs(SYSTEM_E2, user, json.dumps(n["gold"], ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="work")
    ap.add_argument("--out", default="data")
    ap.add_argument("--q-per-dialogue", type=int, default=5)
    ap.add_argument("--e-per-dialogue", type=int, default=3, help="respuestas de un solo tema por reporte")
    ap.add_argument("--narr-per-dialogue", type=int, default=8, help="relatos multi-campo por reporte (máx.)")
    ap.add_argument("--min-valid", type=int, default=20)
    ap.add_argument("--fin-prob", type=float, default=0.5)
    a = ap.parse_args()

    work, out = Path(a.work), Path(a.out)
    out.mkdir(exist_ok=True)
    narr = defaultdict(list)
    if (work / "narratives").exists():
        for p in sorted((work / "narratives").glob("*.json")):
            n = json.load(open(p, encoding="utf-8"))
            narr[n["id"]].append(n)

    per = {}  # id -> [split, ejemplos]
    for p in sorted((work / "dialogues").glob("*.json")):
        d = json.load(open(p, encoding="utf-8"))
        rp = work / "reports" / p.name
        split = json.load(open(rp, encoding="utf-8"))["split"] if rp.exists() else d["split"]
        rng = random.Random(d["id"])
        n_turns = len(d["turns"])
        cands, reaches_end = q_candidates(d)
        qi = rng.sample(cands, min(a.q_per_dialogue, len(cands)))
        ex = [q_example(d, j, rng) for j in qi]
        if reaches_end and rng.random() < a.fin_prob:
            ex.append(q_example(d, n_turns))
        ex += [e2_single(d, j) for j in rng.sample(range(n_turns), min(a.e_per_dialogue, n_turns))]
        # los relatos SINTÉTICOS solo se usan para entrenar: test/valid miden solo datos reales
        usable = [n for n in narr.get(d["id"], []) if not n.get("sintetico") or split == "train"]
        ex += [e2_narrative(n) for n in usable[: a.narr_per_dialogue]]
        per[d["id"]] = [split, ex]

    def count(sp):
        return sum(len(e) for s, e in per.values() if s == sp)

    if count("valid") < a.min_valid:
        movable = sorted((i for i, (s, _) in per.items() if s == "train"), key=lambda i: hashlib.md5(i.encode()).hexdigest())
        for i in movable:
            if count("valid") >= a.min_valid or count("train") - len(per[i][1]) < 2 * a.min_valid:
                break
            per[i][0] = "valid"
            print(f"  (validación corta: reporte {i} movido de train a valid)")
        if count("valid") == 0:
            print("*** AVISO: valid.jsonl quedará vacío; mlx_lm.lora fallará. Genera más diálogos (paso 3).")
    buckets = {"train": [], "valid": [], "test": []}
    reports = {"train": 0, "valid": 0, "test": 0}
    for s, e in per.values():
        buckets[s].extend(e)
        reports[s] += 1
    train_chars = 0
    for name, rows in buckets.items():
        random.Random(0).shuffle(rows)
        with open(out / f"{name}.jsonl", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        chars = sum(len(m["content"]) for r in rows for m in r["messages"])
        train_chars += chars if name == "train" else 0
        multi = sum('"evidencia"' in r["messages"][2]["content"] and r["messages"][2]["content"].count('"valor"') > 1 for r in rows)
        print(f"{name}: {len(rows)} ejemplos de {reports[name]} reportes (relatos multi-campo: {multi})")
    toks = train_chars / 3.2
    print(f"train ≈ {toks/1e6:.2f}M tokens por época | a ~200 tok/s ≈ {toks/200/3600:.1f} h por época")


if __name__ == "__main__":
    main()