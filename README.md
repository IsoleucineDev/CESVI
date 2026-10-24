# CESVI

## Variables de entorno

En Vercel configura estas variables en **Project Settings > Environment Variables**:

```env
VITE_API_BASE_URL=/api
VITE_CASE_ID=EXP-0248
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
FRONT_ORIGIN=https://tu-proyecto.vercel.app
```

`VITE_*` se incorporan al frontend durante el build. Las claves `GEMINI_API_KEY`
y `GROQ_API_KEY` solo se leen en el servidor; no las pongas con el prefijo `VITE_`.
Puedes usar uno o ambos proveedores de IA.

Vercel publica `api/[...path].js` como función serverless y conserva el contrato
`/api` que usa el frontend.
