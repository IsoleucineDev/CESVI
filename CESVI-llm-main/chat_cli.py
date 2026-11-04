"""Chat de prueba en terminal. El CÓDIGO lleva el checklist y verifica; el MODELO redacta preguntas y propone datos.
Una misma respuesta puede llenar varios temas (con evidencia literal verificada por el código).

  python chat_cli.py --model Qwen/Qwen2.5-3B-Instruct --adapter-path ./adapters_v2
Escribe "saltar" (o "no hay dato") para omitir un tema, "salir" para terminar.
"""
import argparse
import json

from mlx_lm import generate, load

from chat_core import process_answer
from schema import MODALIDADES, SYSTEM_Q, build_q_user, parse_q, topics_for


def run(model, tok, system, user, max_tokens=200):
    prompt = tok.apply_chat_template(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        add_generation_prompt=True, tokenize=False)
    return generate(model, tok, prompt=prompt, max_tokens=max_tokens, verbose=False)


def pick_modalidad(s, mods):
    """Acepta el número (0-5) o el nombre ('colision frontal', 'frontal'...)."""
    s = s.strip().lower().replace("ó", "o").replace("_", " ")
    if s.isdigit() and int(s) < len(mods):
        return mods[int(s)]
    names = [m.replace("_", " ") for m in mods]
    if s in names:
        return mods[names.index(s)]
    hits = [m for m, n in zip(mods, names) if s and (s in n or n.startswith(s))]
    return hits[0] if len(hits) == 1 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--adapter-path", default=None)
    a = ap.parse_args()
    model, tok = load(a.model, adapter_path=a.adapter_path)

    mods = [m for m in MODALIDADES if m != "otro"]
    for i, m in enumerate(mods):
        print(f"{i}) {m} — {MODALIDADES[m]}")
    modalidad = None
    while modalidad is None:
        modalidad = pick_modalidad(input("Modalidad (número o nombre): "), mods)
        if modalidad is None:
            print("  No entendí esa opción; escribe el número (0-%d) o el nombre." % (len(mods) - 1))
    vehiculos = {}
    for i in range(1, 4):
        d = input(f"Vehículo V{i} (marca tipo modelo color; Enter para terminar): ").strip()
        if not d:
            break
        vehiculos[f"V{i}"] = d
    vehiculos = vehiculos or {"V1": "vehículo 1"}

    topics = topics_for(modalidad, vehiculos)
    form, estado, last = {}, {}, None
    total = len(topics)
    while True:
        pend = [t for t in topics if t["id"] not in estado and t["id"] not in form]
        if not pend:
            break
        raw = run(model, tok, SYSTEM_Q, build_q_user(modalidad, vehiculos, form, estado, pend, last))
        tema, pregunta = parse_q(raw)
        if tema not in {t["id"] for t in pend}:  # el código manda: si el modelo se sale de la lista, corrige
            tema = pend[0]["id"]
        print(f"\n[{int(100 * (total - len(pend)) / total)}%] ({tema})\nIA: {pregunta}")
        resp = input("Perito: ").strip()
        if resp.lower() == "salir":
            break
        for m in process_answer(estado, tema, pregunta, resp, pend, modalidad, vehiculos,
                                lambda s, u, n: run(model, tok, s, u, n)):
            print("  " + m)
        last = (pregunta, resp)

    print("\n=== ESTADO FINAL ===")
    print(json.dumps({"modalidad": modalidad, "vehiculos": vehiculos, "estado": estado}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()