"""Auditoría de los hechos extraídos (no usa el servidor).

  python audit_facts.py --work work              # diagnóstico
  python audit_facts.py --work work --show 3     # además imprime 3 casos: cada valor junto a su cita literal
  python audit_facts.py --work work --fix        # re-limpia facts existentes (copia en facts_backup)

El % de nulos se calcula contra TODOS los temas aplicables (una llave omitida cuenta como faltante).
Esperado en reportes reales: 30-60% sin dato. Cerca de 10-15% suele significar que el modelo rellena.
"""
import argparse
import collections
import json
import random
import re
import shutil
from pathlib import Path

from facts_utils import revalidate
from schema import topics_for


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="work")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--show", type=int, default=0)
    a = ap.parse_args()
    work = Path(a.work)
    files = sorted((work / "facts").glob("*.json"))
    rates, kinds = [], collections.Counter()
    topic_n, topic_null = collections.Counter(), collections.Counter()
    missing_keys = descartados = 0
    examples = collections.defaultdict(list)
    backup = work / "facts_backup"
    if a.fix:
        backup.mkdir(exist_ok=True)

    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        rep = json.load(open(work / "reports" / f.name, encoding="utf-8"))
        expected = [t["id"] for t in topics_for(d["modalidad"], d["vehiculos"])] if d["modalidad"] != "otro" else []
        vals, new_citas, new_desc, log = revalidate(d, rep["text"])
        missing_keys += sum(1 for i in expected if i not in d["valores"])
        descartados += len(d.get("descartados", {}))
        if expected:
            rates.append(sum(vals.get(i) is None for i in expected) / len(expected))
        for i in expected:
            b = re.sub(r"V[1-3]", "{V}", i)
            topic_n[b] += 1
            topic_null[b] += vals.get(i) is None
        for kind, k, v in log:
            kinds[kind] += 1
            if len(examples[kind]) < 5:
                examples[kind].append(f"{k} = {str(v)[:70]!r}")
        if a.fix and log:
            shutil.copy(f, backup / f.name)
            d["valores"], d["citas"], d["descartados"] = vals, new_citas, new_desc
            json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    n = max(len(rates), 1)
    print(f"Reportes: {len(files)} (con temas aplicables: {len(rates)})")
    print(f"Temas sin dato (null o faltante): {100 * sum(rates) / n:.0f}%")
    print(f"Llaves omitidas por el modelo: {missing_keys}")
    print(f"Valores descartados por no tener cita verificable: {descartados}")
    print("Cambios al revalidar:", dict(kinds) or "ninguno")
    for kind, ex in examples.items():
        print(f"\nEjemplos ({kind}):")
        for e in ex:
            print("  ", e)
    print("\nTemas con MENOS nulos (donde más se rellena):")
    for b in sorted(topic_n, key=lambda b: topic_null[b] / topic_n[b])[:8]:
        print(f"  {b:30s} null {100 * topic_null[b] / topic_n[b]:3.0f}%  (n={topic_n[b]})")

    for f in random.Random(1).sample(files, min(a.show, len(files))):
        d = json.load(open(f, encoding="utf-8"))
        print(f"\n===== {d['id']} | {d['modalidad']} | {d['vehiculos']}")
        for k, v in d["valores"].items():
            if v is not None:
                print(f"  {k}: {v}\n      cita: {d.get('citas', {}).get(k, '(sin cita - dato antiguo)')[:140]}")
        if d.get("descartados"):
            print("  [descartados sin cita]:", json.dumps(d["descartados"], ensure_ascii=False)[:300])


if __name__ == "__main__":
    main()