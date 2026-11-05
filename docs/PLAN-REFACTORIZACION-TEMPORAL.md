# Plan de refactorización — rama `temporal`

## Alcance aprobado

1. **Backend de entrevista:** conservar intactos `schema.py` y `chat_core.py`; reemplazar la generación de preguntas con plantillas deterministas, y delegar la extracción de respuestas al cliente Gemini/Groq existente (`app.services.llm.llm_client`).
2. **Frontend:** completar la modularización de forma incremental, con límites de error en secciones funcionales y extracción de componentes/hook sin cambiar los flujos existentes ni el alcance de fases posteriores.
3. **Documentación:** dejar un README coherente con FastAPI, el frontend Vite, variables de entorno y comandos de desarrollo/verificación.
4. **Validación:** ejecutar typecheck, build y pytest si el entorno proporciona ejecución; anotar explícitamente cualquier verificación no disponible.

## Criterios de aceptación

- El motor no requiere un modelo local para elegir ni redactar la siguiente pregunta.
- Los proveedores de extracción son los ya configurados en `backend/app/services/llm.py`, con sus claves solo del lado servidor.
- `backend/app/services/interview/schema.py` y `chat_core.py` no se modifican.
- Los errores de los módulos visuales extraídos se contienen en límites de error.
- El README refleja los comandos y arquitectura que existen en esta rama; no se documentan capacidades no implementadas como funcionales.

## Orden de trabajo

1. Backend: plantillas y delegación de extracción; pruebas unitarias sin red.
2. Frontend: aislamiento y modularización compatible, respetando la fase solicitada.
3. README y revisión de diffs.
4. Typecheck, build y pruebas backend; reportar resultados reales.
