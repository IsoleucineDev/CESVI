"""Evaluación objetiva del modelo entrenado sobre data/test.jsonl (reportes que NO vio al entrenar).

  python eval_model.py --model Qwen/Qwen2.5-3B-Instruct --adapter-path ./adapters_v2 --split test --n 300

PREGUNTAS (Q): formato | tema esperado (poco informativo) | pregunta coherente con el tema | mezcla de vehículos | fin
EXTRACCIÓN MULTI-CAMPO (E2): JSON válido | cuántas entradas del modelo habría rechazado el guardia (alucinación bruta) |
  recall (datos esperados recuperados tras el guardia) | tema preguntado recuperado | valor igual al esperado.
Soporta también ejemplos antiguos de un solo tema (formato v1).
"""
import argparse
import json
import re
from pathlib import Path

from facts_utils import _norm, _stems4, faithful, mentions_other_vehicle, verify_extractions
from schema import SALTADO, SYSTEM_E, SYSTEM_E2, SYSTEM_Q, parse_json_loose, parse_q


def parse_vehiculos(user):
    veh = {}
    m = re.search(r"^VEHÍCULOS: (.*)$", user, re.M)
    if m:
        for part in m.group(1).split("; "):
            k, _, d = part.partition(": ")
            veh[k.strip()] = d.strip()
    return veh


def on_topic(tema, pregunta, user):
    """Heurística: la pregunta comparte al menos una palabra de contenido con el tema (id + descripción)."""
    m = re.search(rf"^- {re.escape(tema)}: (.*)$", user, re.M)
    desc = (m.group(1) if m else "") + " " + tema.replace("_", " ")
    return bool(_stems4(desc) & _stems4(pregunta))


def parse_e2(user):
    ids = set(re.findall(r"^- (\w+): ", user, re.M))
    asked = re.search(r"^TEMA PREGUNTADO: (\S+)", user, re.M).group(1)
    resp = re.search(r"RESPUESTA DEL PERITO: (.*)", user, re.S).group(1).strip()
    return ids, asked, resp


def same_value(a, b):
    return a == b or (isinstance(a, str) and isinstance(b, str) and _norm(a) == _norm(b))


def evaluate(rows, gen, show=4):
    c = dict(q_n=0, q_formato=0, q_tema=0, q_mezcla=0, q_coherente=0, q_topic_n=0, q_fin_n=0, q_fin_ok=0,
             m_n=0, m_json=0, m_raw=0, m_acc=0, m_gold=0, m_recall=0, m_igual=0, m_extra=0, m_asked_ok=0,
             e_n=0, e_json=0, e_fiel=0)
    bad_q, bad_m = [], []
    tg, th = {}, {}  # recall por tema: datos esperados / recuperados
    for r in rows:
        system, user, gold_text = (m["content"] for m in r["messages"])
        out = gen(system, user)
        if system == SYSTEM_Q:
            c["q_n"] += 1
            tema, preg = parse_q(out)
            gold_tema, _ = parse_q(gold_text)
            c["q_formato"] += tema is not None
            ok = tema == gold_tema
            c["q_tema"] += ok
            mix = bool(tema) and mentions_other_vehicle(tema, preg, parse_vehiculos(user))
            c["q_mezcla"] += mix
            if gold_tema == "FIN":
                c["q_fin_n"] += 1
                c["q_fin_ok"] += tema == "FIN"
                coh = True
            else:
                c["q_topic_n"] += 1
                coh = bool(tema) and on_topic(tema, preg, user)
                c["q_coherente"] += coh
            if (not ok or mix or not coh) and len(bad_q) < show:
                bad_q.append(f"esperado={gold_tema} | modelo={tema}{' | MEZCLA' if mix else ''}"
                             f"{' | FUERA DE TEMA' if not coh else ''}\n     {preg[:110]}")
        elif system == SYSTEM_E2:
            c["m_n"] += 1
            ids, asked, resp = parse_e2(user)
            gold = parse_json_loose(gold_text) or {}
            pred = parse_json_loose(out)
            raw = pred if isinstance(pred, dict) else {}
            c["m_json"] += isinstance(pred, dict)
            acc, rej = verify_extractions(raw, resp, ids, asked)
            c["m_raw"] += len(raw)
            c["m_acc"] += len(acc)
            c["m_gold"] += len(gold)
            hits = [k for k in gold if k in acc]
            c["m_recall"] += len(hits)
            c["m_igual"] += sum(same_value(acc[k], gold[k]["valor"]) for k in hits)
            for k in gold:
                b = re.sub(r"V[1-3]", "{V}", k)
                tg[b] = tg.get(b, 0) + 1
                th[b] = th.get(b, 0) + (k in acc)
            c["m_extra"] += sum(k not in gold for k in acc)
            c["m_asked_ok"] += asked in acc
            miss = [k for k in gold if k not in acc]
            if miss and len(bad_m) < show:
                bad_m.append(f"preguntado={asked} | faltó: {miss} | rechazos del guardia: {rej[:3]}\n"
                             f"     perito: {resp[:120]!r}")
        else:  # formato v1 (un solo tema)
            c["e_n"] += 1
            g = parse_json_loose(gold_text) or {}
            k = next(iter(g))
            pred = parse_json_loose(out)
            ok_json = isinstance(pred, dict) and k in pred
            c["e_json"] += ok_json
            resp = re.search(r"RESPUESTA DEL PERITO: (.*)", user, re.S).group(1).strip()
            c["e_fiel"] += bool(ok_json and (pred[k] == SALTADO or faithful(pred[k], resp)))
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "n/a"
    print(f"\nPREGUNTAS (n={c['q_n']})")
    print(f"  formato válido:            {pct(c['q_formato'], c['q_n'])}")
    print(f"  tema = tema esperado:      {pct(c['q_tema'], c['q_n'])}   (poco informativo: es el primero de la lista)")
    print(f"  pregunta coherente c/ tema:{pct(c['q_coherente'], c['q_topic_n']):>5}   (de {c['q_topic_n']} preguntas de tema)")
    print(f"  fin de entrevista correcto:{pct(c['q_fin_ok'], c['q_fin_n']):>5}   (de {c['q_fin_n']} casos)")
    print(f"  mezcla de vehículos:       {pct(c['q_mezcla'], c['q_n'])}   (ideal: 0%)")
    if c["m_n"]:
        print(f"EXTRACCIÓN MULTI-CAMPO (n={c['m_n']}, {c['m_gold']} datos esperados)")
        print(f"  JSON válido:                      {pct(c['m_json'], c['m_n'])}")
        print(f"  entradas que pasan el guardia:    {pct(c['m_acc'], c['m_raw'])}   (el resto sería alucinación/infidelidad que el chat descarta)")
        print(f"  recall (datos recuperados):       {pct(c['m_recall'], c['m_gold'])}")
        print(f"  tema preguntado recuperado:       {pct(c['m_asked_ok'], c['m_n'])}")
        print(f"  valor igual al esperado:          {pct(c['m_igual'], c['m_recall'])}   (entre los recuperados)")
        print(f"  temas extra aceptados (no esperados): {c['m_extra']}   (no son errores per se: revisar a mano)")
    if tg:
        print("  recall por tema (esperados → recuperados):")
        for b in sorted(tg, key=lambda b: th[b] / tg[b]):
            print(f"    {b:26s} {th[b]:3d}/{tg[b]:<3d} {100 * th[b] / tg[b]:3.0f}%")
    if c["e_n"]:
        print(f"EXTRACCIÓN v1 (n={c['e_n']}): JSON válido {pct(c['e_json'], c['e_n'])} | fiel {pct(c['e_fiel'], c['e_n'])}")
    for title, lst in (("Preguntas a revisar", bad_q), ("Datos no recuperados", bad_m)):
        if lst:
            print(f"\n{title}:")
            for x in lst:
                print("  -", x)
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--adapter-path", default=None)
    ap.add_argument("--data", default="data")
    ap.add_argument("--split", default="test", choices=["test", "valid"])
    ap.add_argument("--n", type=int, default=80)
    a = ap.parse_args()
    from mlx_lm import generate, load
    model, tok = load(a.model, adapter_path=a.adapter_path)

    def gen(system, user):
        prompt = tok.apply_chat_template([{"role": "system", "content": system}, {"role": "user", "content": user}],
                                         add_generation_prompt=True, tokenize=False)
        return generate(model, tok, prompt=prompt, max_tokens=500, verbose=False)

    rows = [json.loads(l) for l in open(Path(a.data) / f"{a.split}.jsonl", encoding="utf-8")][: a.n]
    print(f"Evaluando {len(rows)} ejemplos de {a.split}.jsonl")
    evaluate(rows, gen)


if __name__ == "__main__":
    main()