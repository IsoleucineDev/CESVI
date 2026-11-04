"""Paso 1: separa los .md en reportes individuales, limpia el texto y asigna split POR REPORTE.

Uso: python 01_prepare.py --inputs ../crash_reports_batch_0*.md --out work
"""
import argparse
import glob
import hashlib
import json
import re
from pathlib import Path

CAPTION = re.compile(r"^\s*Fotograf[ií]as?\s*\d", re.I)  # SOLO fotos; los pies de "Imagen N" narran la dinámica y se conservan


def clean(text):
    """Quita los pies de 'Fotografía N' (bloque completo: la línea y sus continuaciones hasta línea en blanco)."""
    out, skip = [], 0
    for l in text.replace("\r", "").split("\n"):
        if skip:
            if not l.strip():
                skip = 0
                out.append(l)
            else:
                skip -= 1
            continue
        if CAPTION.match(l):
            skip = 3  # máx. 3 líneas de continuación
            continue
        out.append(l)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def split_of(rid, valid_pct=10, test_pct=20):
    h = int(hashlib.md5(rid.encode()).hexdigest(), 16) % 100
    return "train" if h < 100 - valid_pct - test_pct else "valid" if h < 100 - test_pct else "test"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs", nargs="+", required=True)
    ap.add_argument("--out", default="work")
    ap.add_argument("--min-chars", type=int, default=3000)
    ap.add_argument("--valid-pct", type=int, default=10)
    ap.add_argument("--test-pct", type=int, default=20)
    a = ap.parse_args()

    out = Path(a.out) / "reports"
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(f for pat in a.inputs for f in glob.glob(str(Path(pat).expanduser())))
    if not files:
        raise SystemExit(
            f"\n*** No encontré ningún archivo con el patrón: {a.inputs}\n"
            f"*** Carpeta actual: {Path.cwd()}\n"
            "*** Busca los .md con:  find ~ -name 'crash_reports_batch_*.md' 2>/dev/null\n"
            "*** y pasa su ruta completa, p. ej.:  --inputs \"/Users/tu_usuario/Documents/CESVI/crash_reports_batch_0*.md\"\n")
    print(f"Archivos de entrada: {len(files)}")
    n = kept = 0
    counts = {"train": 0, "valid": 0, "test": 0}
    for f in files:
        raw = open(f, encoding="utf-8").read().replace("\r", "")
        parts = re.split(r"^# Document: ", raw, flags=re.M)[1:]
        for p in parts:
            n += 1
            title, _, body = p.partition("\n")
            title = title.strip()
            text = clean(body)
            if len(text) < a.min_chars:
                continue
            slug = re.sub(r"[^a-z0-9]+", "_", Path(title).stem.lower()).strip("_")[:60]
            rid = f"{slug}_{hashlib.md5((title + text[:200]).encode()).hexdigest()[:6]}"
            sp = split_of(rid, a.valid_pct, a.test_pct)
            counts[sp] += 1
            kept += 1
            json.dump({"id": rid, "title": title, "split": sp, "text": text},
                      open(out / f"{rid}.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"Documentos encontrados: {n} | conservados: {kept} | splits: {counts}")


if __name__ == "__main__":
    main()