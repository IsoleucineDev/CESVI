# Pipeline de dataset CESVI → modelo que entrevista al perito

## Idea
Código = checklist y % de avance. Modelo = redacta la pregunta (tarea **Q**) y extrae el valor de la respuesta (tarea **E**).
El JSON para Unity se define después; hoy el estado es un dict plano `{id_tema: valor}` (ver `schema.py`).

## Orden de ejecución
```bash
pip install mlx-lm

# --- Modelo maestro GRATIS y local (recomendado para empezar) ---
# Terminal A: levanta un servidor local con un modelo que ya puedas correr
mlx_lm.server --model mlx-community/Qwen2.5-14B-Instruct-4bit --port 8080
# Terminal B: (por defecto ya apunta a localhost:8080)
export CESVI_BACKEND=openai
# Para usar la API de Anthropic en su lugar: pip install anthropic; export CESVI_BACKEND=anthropic ANTHROPIC_API_KEY=...

python 01_prepare.py --inputs "../crash_reports_batch_0*.md" --out work     # sin API
python 02_extract_facts.py --work work --limit 20                            # PRUEBA con 20 y revisa work/facts/
python 03_generate_dialogues.py --work work --limit 20                       # revisa work/dialogues/
# si se ve bien, corre todo (quita --limit; reanuda solo, omite lo ya hecho)
python 02_extract_facts.py --work work --workers 1      # local: 1 worker (2 si te sobra memoria)
python 03_generate_dialogues.py --work work --workers 1
python 04_build_dataset.py --work work --out data
```

## Qué revisar a mano antes de entrenar (30 min bien invertidos)
1. `work/facts/*.json`: ¿la `modalidad` es correcta? ¿hay valores inventados (velocidades!)? Lo que el reporte no dice debe ser `null`.
2. `work/dialogues/*.json`: ¿las preguntas suenan a un asistente de peritos? ¿la `respuesta` contiene el `valor`?
3. Un perito real debería leer ~20 diálogos: es la mejor señal de calidad que tendrás.

## Entrenamiento (ajustado a tu Mac)
```bash
mlx_lm.lora \
  --model Qwen/Qwen2.5-7B-Instruct --train --data ./data \
  --iters 1000 --batch-size 2 --learning-rate 1e-4 --num-layers 16 \
  --max-seq-length 2048 --mask-prompt --grad-checkpoint \
  --steps-per-eval 100 --save-every 100 --val-batches 25 \
  --adapter-path ./cesvi_adapters_v2
```
- Para iterar rápido, prueba primero con `Qwen/Qwen2.5-3B-Instruct`.
- Mira el **val loss**, no solo el train; quédate con el checkpoint donde val deja de bajar.
- Ajusta `--q-per-dialogue/--e-per-dialogue` en el paso 4 para controlar el tamaño (el script imprime horas por época).

## Probar
```bash
python chat_cli.py --model Qwen/Qwen2.5-7B-Instruct --adapter-path ./cesvi_adapters_v2
```
Prueba con casos de `work/dialogues` del split `test` (reportes que el modelo nunca vio).

## Límites conocidos
- Los reportes casi nunca traen velocidades/distancias: esos temas saldrán mayormente como "saltar" en el dataset.
  El modelo aprenderá a *preguntarlos*, pero tendrás pocos ejemplos de respuestas numéricas reales.
  Si te importa, genera después una tanda sintética con valores numéricos plausibles.
- `chat_cli.py` y los pasos 2–3 (usan API / mlx) no se probaron en este entorno; los pasos 1 y 4 sí, con tus reportes.