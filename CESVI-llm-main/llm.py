"""Modelo 'maestro' para los pasos 2 y 3. Soporta varios backends (elige con CESVI_BACKEND):

  openai     (por defecto) cualquier servidor compatible con OpenAI: mlx_lm.server, Ollama, LM Studio,
             Groq, Gemini (endpoint compatible), OpenRouter... -> puede ser 100% local y gratis.
  anthropic  API de Anthropic (de paga).

Variables:
  CESVI_BACKEND       openai | anthropic
  CESVI_BASE_URL      por defecto http://localhost:8080/v1  (mlx_lm.server). Ollama: http://localhost:11434/v1
  CESVI_API_KEY       cualquier texto para servidores locales
  CESVI_TEACHER_MODEL nombre EXACTO del modelo con el que levantaste mlx_lm.server (si no coincide, el servidor
                      intenta descargar ese nombre de Hugging Face y responde 401/404)
"""
import json
import os
import time
import urllib.request

BACKEND = os.environ.get("CESVI_BACKEND", "openai")
MODEL = os.environ.get("CESVI_TEACHER_MODEL",
                       "mlx-community/Qwen2.5-14B-Instruct-4bit" if BACKEND == "openai" else "claude-sonnet-5-5")
BASE_URL = os.environ.get("CESVI_BASE_URL", "http://localhost:8080/v1").rstrip("/")
API_KEY = os.environ.get("CESVI_API_KEY", "local")
TIMEOUT = int(os.environ.get("CESVI_TIMEOUT", "900"))
_client = None


def _ask_openai(system, user, max_tokens):
    body = json.dumps({
        "model": MODEL, "max_tokens": max_tokens, "temperature": 0.3,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def _ask_anthropic(system, user, max_tokens):
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()
    r = _client.messages.create(model=MODEL, max_tokens=max_tokens, temperature=0.3,
                                system=system, messages=[{"role": "user", "content": user}])
    return "".join(b.text for b in r.content if b.type == "text")


_consecutive_fail = 0


def ask(system, user, max_tokens=4000, retries=3):
    """Si fallan varias llamadas seguidas (servidor caído / sin memoria) el programa se detiene
    con un mensaje claro. Es seguro volver a correrlo: retoma lo que ya estaba hecho."""
    global _consecutive_fail
    fn = _ask_anthropic if BACKEND == "anthropic" else _ask_openai
    last = None
    for i in range(retries):
        try:
            out = fn(system, user, max_tokens)
            _consecutive_fail = 0
            return out
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    _consecutive_fail += 1
    if _consecutive_fail >= 3:
        print(f"\n*** El modelo maestro dejó de responder (último error: {last}).\n"
              "*** Revisa la terminal del servidor (¿sin memoria?), reinícialo y vuelve a correr este comando: "
              "retoma donde se quedó.", flush=True)
        os._exit(1)
    raise RuntimeError(f"El modelo maestro falló: {last}")