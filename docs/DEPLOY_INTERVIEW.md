# Despliegue del módulo de entrevista

## Mac Apple Silicon

1. Crear entorno virtual:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Instalar dependencias:

```bash
pip install -r CESVI-llm-main/requirements.txt
```

3. Iniciar servidor del modelo:

```bash
mlx_lm.server --model Qwen/Qwen2.5-3B-Instruct --adapter-path ./adapters_v2 --port 8080
```

4. Iniciar backend desde `backend`:

```bash
PYTHONPATH=. uvicorn app.main:app --port 8000
```

El backend usa `INTERVIEW_BASE_URL=http://localhost:8080/v1` para conectarse al servidor LLM local.

## Linux/VPS

`mlx-lm` no funciona fuera de Apple Silicon. En Linux/VPS usa una API compatible con OpenAI (por ejemplo Groq):

```bash
export INTERVIEW_BASE_URL=https://api.groq.com/openai/v1
export INTERVIEW_API_KEY='gsk_reemplazar_con_tu_clave'
export INTERVIEW_MODEL=llama-3.3-70b-versatile
export INTERVIEW_TIMEOUT=120
```

Luego inicia backend:

```bash
PYTHONPATH=. uvicorn app.main:app --port 8000
```

## Pruebas curl

Crear caso:

```bash
curl -sS -X POST http://127.0.0.1:8000/api/v1/cases \
  -H 'Content-Type: application/json' \
  -d '{"id":"EXP-INTERVIEW-1","title":"Caso de prueba"}'
```

Iniciar entrevista:

```bash
curl -sS -X POST http://127.0.0.1:8000/api/v1/interview/start \
  -H 'Content-Type: application/json' \
  -d '{"case_id":"EXP-INTERVIEW-1","modalidad":"colision_frontal","vehiculos":{"V1":"Nissan Versa gris"},"form":{}}'
```
