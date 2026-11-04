---
description: Ejecuta la Fase 1 (desbloquear el flujo existente) del ticket CESVI
---

# /fase-1 — Desbloquear el flujo existente

Requisito: Fase 0 cerrada y mergeada. Lee `AGENTS.md`, la sección "Fase 1" del ticket y el Anexo C. Rama `fase-1`.

## Antes de empezar
1. Crea la rama `fase-1`.
2. Presenta un plan dividido en los sub-bloques 1A, 1B y 1C y espera mi aprobación. Detente al final de cada sub-bloque para mi revisión.

## 1A — Backend FastAPI (primero, con tests)
1. `backend/app/services/assistant/checklist.py`: portar `buildItems`, `evaluate` y `simulate` desde `server/index.js` con contexto tipado (`location`, `vehicles[]`, `impact`). Tests en `backend/tests/test_checklist.py`, **incluyendo el caso de regresión del bug B1** (contexto con `vehicles` como array vs. objeto).
2. `backend/app/services/assistant/actions.py`: esquema Pydantic de acciones permitidas; descartar acciones con `vehicleId` inexistente. Tests.
3. `backend/app/services/assistant/progress.py`: omisiones (`SKIP_RE`) persistidas en BD en lugar de `Map` en memoria.
4. `backend/app/routers/assistant.py`: **una sola ruta** `POST /api/v1/assistant/chat`; quitar el montaje doble del router en `main.py`; devolver `answer, actions, quickReplies, progress, ready, topics, missing`. `ready` nunca debe ser `true` por defecto.
5. `backend/app/config.py`: `MAX_TOKENS` ≥ 1024; revisar nombres de modelos (verifica vigencia, no asumas).
6. `backend/app/services/llm.py`: eliminar el estado compartido (`last_quick_replies`, `last_fields`); devolver un resultado por llamada. Mantener caché y logs.
7. `backend/app/models.py` + `routers/cases.py`: añadir `Scene` y rutas `GET/POST /cases/{id}/scenes`, `PATCH/DELETE /scenes/{id}`.
8. Correr `pytest`. Detente y reporta (gate 1A).

## 1B — Contrato y frontend
1. `vite.config.ts`: `server.proxy` de `/api` hacia el backend (puerto a definir en `DECISIONES.md`); alinear CORS (`ALLOWED_ORIGINS`) con el puerto real del front.
2. `src/types/api.ts`: un contrato único (`Vehicle`, `Scene`, `CaseContext`, `AssistantReply`). Si es viable, generar tipos desde el OpenAPI de FastAPI; si no, déjalo manual y anótalo como deuda.
3. `src/lib/api.ts`: único cliente HTTP, ruta de chat única `/v1/assistant/chat`.
4. `src/hooks/useAssistantChat.ts`: migrar a `api.ts`; luego **eliminar** `src/lib/assistantApi.ts`.
5. `src/App.tsx` (`assistantContext`): enviar `location`, `vehicles[]` (`{id,type,speed,braking,heading,position}`) e `impact`, con la forma que espera el backend (bug B1).
6. `src/App.tsx`: montar `useAssistantActions(applyActions)` e implementar `applyActions` para `set_*`, `rotate_element`, `move_vehicle`, `focus_scene_area`, `set_impact_point` (bug B5). Preferible como función pura en `src/features/assistant/applyActions.ts` con pruebas.
7. `src/components/assistant/CaseProgress.tsx`: alinear `STEPS` con los tópicos reales que devuelve el backend.
8. `src/components/AssistantPanel.tsx` (huérfano): eliminar tras copiar su tipo `AssistantContext` al contrato único. **Confirmación previa.**
9. `src/App.tsx` (`addFrame`, `createNewCase`): persistir escenas con la API.
10. `pnpm typecheck && pnpm build`. Detente y reporta (gate 1B).

## 1C — Prueba de integración manual
1. Levanta backend y frontend. En el navegador: escribir ubicación, mover un vehículo, decirle al asistente "el vehículo V1 iba a 50 km/h" y comprobar que el progreso sube y el inspector/mapa reflejan el dato.
2. Reporta con capturas o pasos reproducibles. Si algo no funciona, lista causa probable; no lo des por hecho.
3. Solo si el backend FastAPI tiene paridad y tests: **pregúntame** si se retira `server/` y `api/[...path].js` (y el rewrite de `vercel.json`). No lo hagas sin mi "sí".

## Cierre
Actualiza el ticket (`- [x]`), entrega resumen con verificaciones realizadas y no realizadas, y detente. No empieces la Fase 2.
