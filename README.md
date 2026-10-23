# CESVI

## Backend

La aplicación incluye funciones serverless en `api/`, compatibles con Vercel y con el cliente de `src/lib/api.ts`.

Endpoints disponibles:

- `GET /api/cases/:caseId`
- `GET /api/cases/:caseId/scenes`
- `POST /api/cases/:caseId/scenes` con `{ "name": string, "order": number }`
- `PATCH /api/scenes/:sceneId` con `{ "name": string }`
- `DELETE /api/scenes/:sceneId`
- `POST /api/ai/chat` con `{ "message": string, "context": object, "stream": boolean }`

El almacenamiento actual es una semilla en memoria para que el flujo funcione inmediatamente en desarrollo y preview. En producción, las instancias serverless no garantizan persistencia entre invocaciones; el siguiente paso de infraestructura es conectar `api/_store.ts` a PostgreSQL, Redis o Vercel KV manteniendo estos mismos contratos.

Para desplegar frontend y API:

```bash
npm install
npm run build
vercel deploy
```
