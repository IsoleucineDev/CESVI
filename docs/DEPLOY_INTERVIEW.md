# Despliegue del módulo de entrevista

El backend habla con un servidor LLM compatible con OpenAI. Se configura con las variables `INTERVIEW_BASE_URL`, `INTERVIEW_API_KEY`, `INTERVIEW_MODEL` e `INTERVIEW_TIMEOUT`.

## 1. Local en Mac Apple Silicon

Crear entorno virtual e instalar dependencias:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r CESVI-llm-main/requirements.txt
```

Iniciar el servidor del modelo:

```bash
mlx_lm.server \
  --model Qwen/Qwen2.5-3B-Instruct \
  --adapter-path ./adapters_v2 \
  --port 8080
```

En otra terminal, con el mismo entorno virtual, arrancar FastAPI:

```bash
cd backend
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000
```

El backend usa por defecto `http://localhost:8080/v1` (ver `backend/.env.example`), por lo que no necesita configuración extra.

## 2. Linux / VPS

`mlx-lm` no funciona fuera de Apple Silicon. En Linux o VPS hay que usar una API compatible con OpenAI, por ejemplo Groq:

```bash
export INTERVIEW_BASE_URL=https://api.groq.com/openai/v1
export INTERVIEW_API_KEY='gsk_reemplazar_con_tu_clave'
export INTERVIEW_MODEL=llama-3.3-70b-versatile
export INTERVIEW_TIMEOUT=120
```

Arrancar FastAPI:

```bash
cd backend
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Nunca subas claves reales al repositorio. `backend/.env` está en `.gitignore`.

## 3. Pruebas con curl

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
  -d '{
    "case_id": "EXP-INTERVIEW-1",
    "modalidad": "colision_frontal",
    "vehiculos": {"V1": "Nissan Versa gris"},
    "form": {}
  }'
```
