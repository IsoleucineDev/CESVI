# CESVI

## Configuración de API y Vercel

El frontend usa el contrato RAT del backend (`/api/v1/rat`). En Vercel configura
estas variables de entorno para cada entorno:

- `VITE_API_BASE_URL`: URL pública del backend, por ejemplo
  `https://backend.example.com/api/v1/rat`.
- `VITE_CASE_ID`: identificador numérico del siniestro o su número de expediente,
  por ejemplo `EXP-0248`.
- `VITE_AI_API_URL`: endpoint del agente que acepta `POST` con
  `{ caseId, message, context, stream }` y devuelve JSON o SSE. Si se omite,
  usa `${VITE_API_BASE_URL}/ai/chat`.
- `VITE_SCENES_API_BASE_URL`: opcional; solo es necesario si el backend expone
  escenas fuera del recurso de siniestros.

El build de Vercel usa `npm ci`, `npm run build` y publica `dist`. No se debe
desplegar `gh-pages`; la rama de producción es `main`. La autenticación debe
resolverse mediante cookie/sesión o un proxy backend; no se deben colocar
secretos en variables `VITE_*`, porque quedan incluidos en el JavaScript público.
