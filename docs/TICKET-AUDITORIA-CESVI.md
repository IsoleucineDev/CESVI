# Ticket Auditoria y Plan de Refactorizacion - Proyecto CESVI

> **Alcance:** rama `CESVI-temporal` (ZIP). Auditoría **estática**: no se ejecutaron `tsc`, `vite build`, `pytest` ni el servidor (el entorno de análisis no tiene red para instalar dependencias). Cada hallazgo cita archivo y símbolo para que puedas reproducirlo.
> **Fecha:** 25-oct-2026. **Revisión 4:** incorpora la migración de Leaflet a **CesiumJS** (visor 3D optimizado), la decisión de backend con su separación en módulos (Anexo C) y la decisión de despliegue **Vercel + Neon** (Anexo C.7). Los cambios están marcados con 🆕.
> **Limitación:** no se pudo abrir el Sandcastle `itwin-feature-service` (el sitio bloquea acceso automatizado); se asumió que muestra datos de la plataforma iTwin servidos como 3D Tiles en CesiumJS. Verifícalo antes de fijar el alcance.
> **Nota de higiene:** `.github/agents/my-agent.agent.md` contiene un prompt que impone un formato de respuesta con "código completo". No se aplicó a esta auditoría.

---

## 1. Diagnostico Actual

### Resumen ejecutivo

El proyecto es hoy **un editor de escena sobre Leaflet con un chat de IA al lado**. **No existe motor de simulación**: no hay física, ni cinemática, ni interpolación, ni visor de animación. El botón "Reproducir" solo avanza de pestaña de escena cada 900 ms. Además, el asistente de IA **no está conectado al estado real del mapa** (ver bugs B1-B3), por lo que su "progreso del expediente" es incorrecto.

Hay **dos backends paralelos e incompatibles** (Node/Express y Python/FastAPI) y **dos capas de API en el frontend** que apuntan a rutas distintas.

### 1.1 Lo que SI funciona y debemos CONSERVAR

| Componente | Archivo | Por qué conservarlo |
|---|---|---|
| Mapa Leaflet con tiles OSM, zoom, `flyTo` y bridge de instancia | `src/App.tsx` → `MapViewport`, `MapInstanceBridge` | Base cartográfica ya operativa. |
| Overlay geo-referenciado con **arrastrar / rotar / escalar** en lat-lng | `src/App.tsx` → `GeoMapOverlay`, `DragState`, `getPixelsPerMeter`, `getVehicleDimensions` | Ya convierte px↔metros y dimensiona vehículos en **metros reales** (4.5 m auto, 9.5 m camión…). Es el cimiento correcto para una escala pericial. 🆕 La **lógica** (dimensiones en metros, drag/rotate/scale, catálogo) se porta a Cesium; el código de render Leaflet se reemplaza. |
| Drag & drop de catálogo (MIME `application/x-cesvi-item`) | `GeoMapOverlay.handleDrop`, `CatalogMenu`, `catalogMenus` | Catálogo extenso de objetos/indicios/vehículos ya clasificado. |
| Clasificación de materiales | `getMaterialType` | Útil como semilla para coeficientes de fricción/restitución. |
| Geocodificación con Nominatim (debounce 300 ms + `AbortController`) | `App.tsx` efecto de `locationQuery` | Correcto; solo falta persistir y respetar la política de uso de Nominatim. |
| Undo/redo básico, atajos de teclado, exportación TXT | `undoLastObject`, `redoLastObject`, `exportReport` | Funcional como prototipo. |
| Sistema de escenas (pestañas, máx. 30) y timeline visual | `frames`, `selectedFrame`, `.timeline` | La UI de línea de tiempo sirve; falta el modelo de datos de keyframes. |
| Shell UI modular | `components/layout/TopBar.tsx`, `components/ui/*`, `components/assistant/*` | Bien separado y reutilizable. |
| Cálculo de "datos requeridos" **en código, no en la IA** | `server/index.js` → `buildItems`, `evaluate`, `simulate` | Excelente decisión de diseño (trazabilidad). Se conserva, pero hay que alimentarlo con el contexto correcto. |
| Extracción de dictámenes PDF con **cita textual validada por código** | `backend/app/routers/documents.py` (`extract_document_fields`) + test `test_extract_validation_and_token_logging` | Es el mejor activo de trazabilidad del repo: descarta valores sin cita literal verificable. |
| Modelo de datos + manejo de errores homogéneo `{code, message}` + caché y log de LLM | `backend/app/models.py`, `exceptions.py`, `LLMCache`, `LLMLog` | Base sólida para persistencia y auditoría. |
| Tests de API backend (health, CRUD de casos, subida PDF, extracción) | `backend/tests/test_api.py` | Se conservan y se amplían. |
| Despliegue serverless | `vercel.json`, `api/[...path].js` | Válido si se decide Node como backend único (ver §3). |

### 1.2 Lo que ESTA FALLANDO o INCOMPLETO

1. **No hay motor de simulación ni reconstrucción cinemática.** `grep` de `speed|braking|heading|physics|friction|kinemat` en `App.tsx` solo devuelve el `assistantContext`; no hay una sola ecuación de movimiento.
2. **El inspector de vehículo es decorativo.** En `App.tsx` (bloque `object-inspector`): "VEHÍCULO 01 / Nissan Versa 2021" está escrito a mano; los `<select>`/`<input>` usan `defaultValue` (no controlados), así que **ningún valor entra al estado ni al cálculo**. El selector "Tipo" ofrece "Camión" mientras el backend espera "Carga".
3. **El asistente nunca modifica el mapa.** `useAssistantActions` (el puente `cesvi:actions`) **no se invoca en ningún archivo**. El hook de chat emite el evento y nadie lo escucha: las acciones `set_speed`, `rotate_element`, `move_vehicle`, `set_impact_point`, etc. se descartan.
4. **`cesvi:progress` solo lo consume `CaseProgress`**, que además usa `STEPS` con "Evidencia" e "Informe" que el servidor **nunca** reporta como tópicos (`TOPICS = Ubicación, Vehículos, Dinámica`), por lo que esos pasos jamás se marcan.
5. **Las escenas no guardan estado.** `droppedItems`, `mapVehicles`, `impactPosition` son globales; cambiar de pestaña no cambia posiciones. No hay keyframes por escena → no se puede animar.
6. **`addFrame` y `createNewCase` no persisten.** `api.createScene / updateScene / deleteScene` están definidos y **no se usan en ningún lado**; las escenas nuevas solo viven en memoria del navegador.
7. **Solo existen dos vehículos fijos `V1`/`V2`** (`Record<"V1"|"V2", GeoVehicle>`). Los vehículos arrastrados desde el catálogo entran como `droppedItems` con id `Date.now()-n`, que el asistente y el backend no reconocen como vehículos.
8. **Datos simulados en UI:** `Dashboard` (12 casos, 28 reconstrucciones, 4.2 h), el marcador "Impacto · 00:03.38" y los casos recientes están **hardcodeados**. Para un producto pericial esto es riesgoso: aparenta datos reales.
9. **Modo "Medir" sin implementación.** `mapMode === "measure"` solo cambia una clase CSS; no hay herramienta de medición.
10. **Modularización a medio hacer (código duplicado/muerto).** `App.tsx` (2 338 líneas) redefine `Icon`, `Button`, `ToolButton`, `VehicleSprite`, `getVehicleVariant`, `IconName`, `DroppedItem`, `GeoVehicle`, `GeoPosition`, `LocationSuggestion`, aunque ya existen en `components/ui/*`, `components/map/*` y `types/canvas.ts`, que `App.tsx` **no importa**. Existen además **dos `AssistantPanel`**: `components/AssistantPanel.tsx` (424 líneas, huérfano) y `components/assistant/AssistantPanel.tsx` (el activo).
11. **Dos backends y dos clientes HTTP sin contrato común** (detalle en §2).
12. **Higiene del repo:** `goose-x86_64-unknown-linux-gnu.tar.bz2` (**~76 MB**) y `Microrred en 10 rondas.html` (ajeno al proyecto) versionados; `__pycache__/*.pyc` versionados (falta en `.gitignore`); dos lockfiles (`package-lock.json` y `pnpm-lock.yaml`) mientras `packageManager` declara pnpm; `setup.sh` (24 KB) **sobrescribe** `server/index.js`, `assistantApi.ts`, `useAssistantChat.ts`, `CaseProgress.tsx` al ejecutarse.
13. **Tests:** no hay ninguna prueba del frontend ni del servidor Node (el que realmente calcula progreso); no hay script `test`/`typecheck` en `package.json`.

---

## 2. Puntos Criticos de Bloqueo (Bugs / Missing Links)

**B1 — Contrato de contexto roto (frontend → servidor Node). Severidad: BLOQUEANTE.**
`App.tsx` envía `assistantContext = { case, scene, selectedTool, selectedFrame, droppedItems, vehicles: mapVehicles }`, donde `vehicles` es un **objeto** `{V1:{lat,lng,rotation,scale}, V2:{…}}`.
`server/index.js → buildItems(ctx)` espera `ctx.location` (string), `ctx.vehicles` como **array** con `{id, type, speed, braking, heading}` e `ctx.impact`. Resultado: `Array.isArray(ctx.vehicles)` es falso → siempre aparece "vehículos involucrados (colocarlos en el mapa)" como pendiente, "ubicación" nunca se marca como hecha y `impact` nunca existe. **El progreso del expediente y la lista de faltantes son incorrectos aunque el perito llene todo.**
*Evidencia:* el `AssistantContext` correcto sigue documentado en el componente huérfano `components/AssistantPanel.tsx` (tipo con `location`, `vehicles[]`, `impact`).

**B2 — Tres rutas distintas para el chat y ninguna coincide con ambos backends. Severidad: BLOQUEANTE.**
- `lib/assistantApi.ts` (usado por el panel activo) → `POST /api/ai/chat` → solo lo implementa bien el Node.
- `lib/api.ts → sendAssistantMessage` (usado solo por el panel huérfano) → `POST /api/assistant/chat` → **Node no tiene esa ruta**.
- FastAPI monta `assistant.router` **dos veces** (bajo `/api/v1` y en raíz) con prefijo `""`, por lo que expone `/api/v1/assistant/chat` y `/assistant/chat`, pero **no** `/api/ai/chat` ni `/api/assistant/chat`.
- `lib/api.ts` llama a `/cases/:id/scenes` y `/scenes/:id`: FastAPI **no tiene** rutas ni modelo de escenas.

**B3 — La respuesta de FastAPI no cumple el contrato que consume el frontend.** `assistant_chat` devuelve `{answer, text, quick_replies, fields, ready: True}` y **siempre** `ready: true`; no devuelve `actions`, `progress`, `topics` ni `missing`. Además el esquema `fields` (`vehicle`, `speed_kmh`, …) es distinto del esquema de `actions` del Node. Y `MAX_TOKENS=300` puede truncar el JSON obligatorio y romper el parseo.

**B4 — No hay proxy de desarrollo.** `VITE_API_BASE_URL=/api`, pero `vite.config.ts` no define `server.proxy` (el servidor Vite corre en `:8443` con `strictPort`, el Node en `:3001`, FastAPI sin puerto definido). En local, `/api/*` devuelve el `index.html` del SPA. `FRONT_ORIGIN` por defecto (`http://localhost:5173`) tampoco coincide con el puerto real del front.

**B5 — Acciones del asistente sin consumidor.** Ver §1.2-3. Sin `useAssistantActions` montado en `App.tsx`, el asistente no puede mover vehículos, ni fijar velocidad/frenado/rumbo, ni colocar el impacto.

**B6 — Sin modelo de vehículo ni de keyframes.** Falta una entidad `Vehicle {id, tipo, masa, dimensiones, velocidad, desaceleración/μ, rumbo, trayectoria[]}` y `Scene {t, poses{vehicleId→{lat,lng,heading}}}`. Sin esto no hay nada que simular ni reproducir.

**B7 — Sin motor físico (el "Backend Físico" no existe).** Ninguna de las dos APIs calcula velocidad inicial por huella de frenado, energía, delta-V ni trayectoria. Además el `SYSTEM_PROMPT` de FastAPI dice "no hagas cálculos", lo cual es correcto: **el cálculo debe vivir en código determinista**, no en el LLM.

**B8 — Estado del servidor en memoria y compartido.** Node: `cases`, `skips`, `history` son `Map` en memoria (se pierden al reiniciar y **no sobreviven en Vercel serverless**, donde cada invocación puede ser una instancia nueva). FastAPI: el `llm_client` es un singleton con `last_quick_replies`/`last_fields` como atributos de instancia → condición de carrera entre peticiones concurrentes.

**B9 — Unidades y coordenadas no definidas.** `speed` (km/h), `braking` (m), `heading` (texto "Noreste") y `rotation` del sprite (grados, sentido y origen no documentados) conviven sin conversión. Sin definir sistema de referencia (lat/lng WGS84 ↔ plano métrico local) no hay precisión cinemática posible.

**B10 — Configuración de modelos obsoleta/inconsistente.** FastAPI: `GEMINI_MODEL="gemini-1.5-flash"` y `GROQ_MODEL="llama-3.3-70b-versatile"` vs Node: `gemini-flash-latest` y `openai/gpt-oss-120b`. Verifica vigencia antes de entregar.

**B11 — Trazabilidad ausente en el flujo de simulación.** No se registra qué dato vino de: perito, PDF (con cita), IA o valor por defecto. Para un dictamen esto es un requisito, no un extra.

**B12 — Nominatim.** Se consulta desde el navegador sin `User-Agent`/identificación ni caché; su política de uso limita a ~1 req/s y prohíbe autocompletado intensivo. Riesgo de bloqueo en demo.

---

## 3. Arquitectura Propuesta (Inspirada en Open Source)

### 3.1 Qué se toma de cada referencia (con criterio realista)

| Referencia | Qué aprovechar | Qué NO copiar |
|---|---|---|
| **Reconstruct100CarNDSData** | Patrón de **pipeline de datos de trayectoria**: serie temporal por vehículo `(t, x, y, v, a, ψ)` + vista cenital (BEV) derivada. Úsalo como modelo del **esquema de trayectorias** y de su validación. | Sus datos y procesamiento son de naturalística de conducción (100-Car), no de reconstrucción pericial. |
| **UXsim** | Idea de **simulación mesoscópica desacoplada de la vista**: el simulador produce estados por paso de tiempo y la UI solo los reproduce. | Es un simulador de **flujo de tráfico** (macro/meso), no de colisiones; no sirve para impactos. |
| **Cesium (Sandcastle)** 🆕 | **Visor principal en sustitución de Leaflet**: reloj + `SampledPositionProperty` (posiciones muestreadas con interpolación), modelos glTF, 3D Tiles con consulta de propiedades por feature, cámara top-down para vista cenital. | **No adoptar iTwin** (plataforma Bentley para BIM/infraestructura, con cuenta y nube propias). Se toma solo el patrón "3D Tiles + propiedades por feature". |
| **three.js** | 🆕 Ya **no se prevé** como visor: Cesium cubre escena, cámara y animación. Solo útil si se necesita un render muy específico fuera del globo. | No duplicar visores 3D. |
| **UnityGaussianCapture** | Referencia de reconstrucción 3D a partir de captura (Gaussian Splatting). | Está fuera del alcance del prototipo; solo como línea futura de "importar nube de evidencia fotográfica". |

> Conclusión: las referencias aportan **patrones** (serie temporal, reloj de reproducción, desacople simulación/visor). **Ninguna aporta el cálculo pericial**; este debe implementarse con fórmulas estándar de reconstrucción de colisiones (ver Criterios de Aceptación).

### 3.2 Flujo objetivo (una sola fuente de verdad)

```
 [Visor Cesium]──┐                        ┌──► [Inspector controlado]
 [Formulario]────┼──► Store del Caso ◄────┤
 [Asistente IA]──┘   (Case → Vehicles,    └──► [Timeline / keyframes]
   (acciones)          Scenes, Evidence)
                           │  POST /api/cases/:id/simulate
                           ▼
              [Backend Físico determinista]
   entrada: vehículos, μ de superficie, pendiente, huellas, escenas
   salida:  trayectorias muestreadas (t,x,y,ψ,v) + energía + delta-V
            + registro de supuestos e incertidumbre
                           │
                           ▼
              [Visor de Animación]  (🆕 reloj de Cesium + interpolación sobre SampledPositionProperty)
                           │
                           ▼
              [Informe / dictamen con trazabilidad]
```

Decisiones clave:

1. **Un solo backend.** 🆕 **Decisión recomendada: conservar FastAPI y retirar Node** tras portar `buildItems/evaluate/simulate`, `SKIP_RE` y el retry con respaldo Gemini → Groq (ver Anexo C). Recomendado: **FastAPI** (ya tiene BD relacional, PDFs, trazabilidad, tests y Python facilita `numpy/scipy` para la física). El Node queda como referencia hasta migrar `buildItems/evaluate/simulate` (que son buenos). Si se prefiere Vercel puro, la alternativa es Node único, pero entonces la persistencia debe pasar a una BD externa. **Decídelo antes de tocar código.**
2. **Un solo cliente HTTP** (`src/lib/api.ts`) con **un solo contrato** tipado (`src/types/api.ts`); eliminar `assistantApi.ts`.
3. **Store de caso único** (estado levantado de `App.tsx`; `useReducer` o Zustand): `Case`, `Vehicle[]`, `Scene[]` con `poses`, `Evidence[]`, `impact`, `assumptions[]`.
4. **El LLM solo extrae y guía; no calcula.** Sus acciones se validan con esquema (p. ej. Zod/Pydantic) antes de tocar el store.
5. **El backend físico es una función pura y testeable** que recibe el caso y devuelve trayectorias; el visor solo las reproduce (patrón Cesium/UXsim).
6. **Trazabilidad:** cada campo guarda `{value, unit, source: perito|pdf|ia|default, quote?, page?, timestamp}`.
7. 🆕 **Cesium sin iTwin.** CesiumJS (código abierto) como visor; datos base (terreno/edificios) por Cesium ion u OSM Buildings con token en servidor/variable de entorno y atribución visible. Verifica en la documentación vigente la versión de CesiumJS, los términos de uso de cada fuente de datos y los límites del plan gratuito antes de fijarlos.
8. 🆕 **Física en plano local, visor en globo.** El backend opera en un marco métrico local (ENU); Cesium solo recibe poses ya calculadas y las convierte con `Transforms.eastNorthUpToFixedFrame`. Cesium **no** es fuente de verdad geométrica del dictamen.
9. 🆕 **Estrategia de migración (strangler):** Leaflet convive detrás de una bandera (`VITE_VIEWER=leaflet|cesium`) hasta lograr paridad de funciones; después se elimina.

### 3.3 🆕 Optimización del visor Cesium

- **Render bajo demanda:** `requestRenderMode: true` y `maximumRenderTimeChange` ajustado; forzar `scene.requestRender()` solo al editar o reproducir.
- **Bundle:** carga diferida (`import()`) del módulo Cesium y `vite-plugin-cesium` (o copia manual de `Workers/Assets/Widgets`); el resto de la UI queda fuera de ese chunk.
- **Entidades:** pocas entidades; modelos glTF **ligeros y compartidos** (un modelo por variante), `CLAMP_TO_GROUND` y muestreo de terreno (`sampleTerrainMostDetailed`) solo en puntos clave, no por fotograma.
- **Calidad adaptativa:** `resolutionScale` y `maximumScreenSpaceError` reducibles en equipos modestos; desactivar efectos no necesarios (niebla, atmósfera, sombras) en modo edición.
- **React:** capa delgada propia (o Resium) alimentada por el store único; **prohibido** recrear entidades en cada render; actualizar propiedades por id.
- **Vista cenital (BEV):** cámara top-down/ortográfica con orientación norte-arriba como modo predefinido para láminas del informe.
- **Rendimiento medible:** presupuesto de referencia (p. ej. ≥ 30 fps en el equipo objetivo con 2 vehículos + 50 objetos) registrado en el CI o en una checklist manual.

---

## 4. Checklist de Tareas Archivo por Archivo (Plan de Accion)

> Orden recomendado: **Fase 0 → 1 → 2 → 3 → 4**. No avances de fase sin cerrar sus criterios.

### Fase 0 — Higiene y decisiones (medio día)

- [x] `DECISIONES.md` (nuevo): registrar la elección de **backend único** (FastAPI recomendado), unidades (SI: m, s, m/s, grados) y sistema de coordenadas.
- [x] `goose-x86_64-unknown-linux-gnu.tar.bz2`: eliminar del repo (≈76 MB) y purgar del historial si procede.
- [x] `Microrred en 10 rondas.html`: eliminar (no pertenece al proyecto).
- [x] `.gitignore`: añadir `__pycache__/`, `*.pyc`, `.pytest_cache/`; quitar los `.pyc` ya versionados.
- [x] `package-lock.json` **o** `pnpm-lock.yaml`: dejar solo el del gestor declarado en `packageManager` (pnpm).
- [x] `setup.sh`: retirar o convertir en documentación; hoy sobrescribe archivos del código fuente.
- [x] `.github/agents/my-agent.agent.md`: revisar/eliminar; contiene un prompt genérico ajeno al proyecto.
- [x] `README.md`: documentar arranque local (puertos, variables, cómo correr tests).
- [x] `package.json`: añadir scripts `typecheck` (`tsc --noEmit`) y `test`.

### Fase 1 — Desbloquear el flujo existente (1–2 días)

- [ ] `vite.config.ts`: añadir `server.proxy` de `/api` hacia el backend elegido; alinear puertos y `FRONT_ORIGIN`/`ALLOWED_ORIGINS` (B4).
- [ ] `src/types/api.ts`: definir **un contrato único**: `Vehicle`, `Scene`, `CaseContext` (con `location`, `vehicles[]`, `impact`), `AssistantReply` (`answer, actions, quickReplies, progress, ready, topics, missing`).
- [ ] `src/lib/api.ts`: unificar aquí `getCase`, escenas CRUD y `sendAssistantMessage` con una única ruta de chat; borrar el parseo SSE si se decide respuesta JSON.
- [ ] `src/lib/assistantApi.ts`: **eliminar** (duplica `api.ts`) y migrar `useAssistantChat.ts` a `api.ts`.
- [ ] `src/App.tsx` (`assistantContext`): construir el contexto con la forma que espera el servidor: `location` (de `locationQuery`), `vehicles[]` con `{id, type, speed, braking, heading, position}`, `impact` (de `impactPosition`) (B1).
- [ ] `src/App.tsx`: montar `useAssistantActions(applyActions)` e implementar `applyActions` para `set_*`, `rotate_element`, `move_vehicle`, `focus_scene_area`, `set_impact_point` (B5).
- [ ] `src/hooks/useAssistantActions.ts`: mantener; añadir validación de acciones antes de despachar.
- [ ] `src/components/assistant/CaseProgress.tsx`: alinear `STEPS` con los tópicos reales (`Ubicación, Vehículos, Dinámica`) o añadir "Evidencia"/"Informe" en el backend.
- [ ] `src/components/AssistantPanel.tsx` (huérfano): **eliminar** tras copiar su tipo `AssistantContext` al contrato único.
- [ ] `backend/app/routers/assistant.py`: exponer **una sola ruta** (`POST /api/v1/assistant/chat`), eliminar el montaje doble y devolver `actions`, `progress`, `topics`, `missing` (portar `buildItems/evaluate/simulate` desde `server/index.js`).
- [ ] `backend/app/config.py`: subir `MAX_TOKENS` (≥ 1024) para no truncar el JSON; actualizar modelos (B10).
- [ ] `backend/app/services/llm.py`: eliminar `last_quick_replies/last_fields` del singleton; devolver un objeto de resultado por llamada (B8).
- [ ] `backend/app/routers/cases.py`: añadir `GET/POST/PATCH/DELETE /cases/{id}/scenes` y `/scenes/{id}`; hacer `GET /cases/{id}` idempotente si se quiere el comportamiento "auto-crear" del Node.
- [ ] `backend/app/models.py`: añadir tablas `Scene`, `Vehicle`, `SceneVehiclePose`, `Evidence`, `Assumption`.
- [ ] `src/App.tsx` (`addFrame`, `createNewCase`): llamar a `api.createScene` / persistir; usar `updateScene`/`deleteScene` desde las pestañas.

### Fase 2 — Modelo de datos y limpieza de `App.tsx` (2–3 días)

- [ ] `src/store/caseStore.ts` (nuevo): estado único (vehículos, escenas con poses, evidencia, impacto, supuestos) con acciones tipadas.
- [ ] `src/App.tsx`: reemplazar los ~25 `useState` por el store; **extraer** `GeoMapOverlay`, `CatalogMenu`, `Dashboard` a `components/`.
- [ ] 🆕 `package.json`: añadir `cesium` (versión vigente verificada) y `vite-plugin-cesium`; quitar `leaflet`/`react-leaflet` **solo al cerrar la paridad**.
- [ ] 🆕 `vite.config.ts`: registrar `vite-plugin-cesium` y definir `CESIUM_BASE_URL`; mantener el `base` de Figma Make sin romper los assets.
- [ ] 🆕 `.env.example`: añadir `VITE_CESIUM_ION_TOKEN` (o proxy de tiles en el backend) y `VITE_VIEWER`.
- [ ] 🆕 `src/components/viewer/ViewerContainer.tsx` (nuevo): selecciona Leaflet o Cesium según `VITE_VIEWER`; expone una **interfaz común** (`addVehicle`, `moveEntity`, `setPose`, `flyTo`, `pick`, `measure`).
- [ ] 🆕 `src/components/viewer/cesium/CesiumViewport.tsx` (nuevo): crea el `Viewer` con `requestRenderMode`, terreno, desactiva widgets innecesarios, destruye recursos al desmontar.
- [ ] 🆕 `src/components/viewer/cesium/EntityLayer.tsx` (nuevo): vehículos, objetos, indicios e impacto como entidades; sincroniza por id con el store.
- [ ] 🆕 `src/components/viewer/cesium/useEntityDrag.ts` (nuevo): portar mover/rotar/escalar de `GeoMapOverlay` usando `scene.pickPosition`/`camera.pickEllipsoid` y proyección local; conservar escala en metros.
- [ ] 🆕 `src/components/viewer/cesium/DropTarget.tsx` (nuevo): portar el drag & drop del catálogo (`application/x-cesvi-item`).
- [ ] 🆕 `src/components/viewer/cesium/models/*.glb` (nuevo): modelos glTF ligeros por variante (auto, camioneta, camión, moto, peatón); documentar licencia y dimensiones reales.
- [ ] 🆕 `src/components/viewer/cesium/GeocoderBridge.ts` (nuevo): reutilizar la búsqueda Nominatim existente con `camera.flyTo`; respetar límites de uso (B12).
- [ ] 🆕 `src/components/viewer/cesium/FeatureInspector.tsx` (nuevo): al hacer clic en un 3D Tile (edificio/vía), mostrar sus propiedades (patrón del ejemplo iTwin) y permitir adjuntarlas como evidencia con su fuente.
- [ ] `src/App.tsx`: borrar definiciones duplicadas (`Icon`, `Button`, `ToolButton`, `VehicleSprite`, `getVehicleVariant`, `IconName`, `DroppedItem`, `GeoVehicle`, `GeoPosition`, `LocationSuggestion`) y **importarlas** desde `components/ui/*`, `components/map/*`, `types/canvas.ts`.
- [ ] `src/components/map/VehicleSprite.tsx` y `vehicleUtils.ts`: confirmar que son equivalentes a las versiones inline y dejarlas como únicas.
- [ ] `src/components/inspector/VehicleInspector.tsx` (nuevo): inspector **controlado** y ligado al vehículo seleccionado (tipo, velocidad, rumbo en grados, frenado, masa, μ); sustituye el bloque hardcodeado.
- [ ] `src/types/canvas.ts`: ampliar con `Vehicle`, `Pose`, `KeyframeScene`.
- [ ] `src/App.tsx`: guardar y restaurar **poses por escena** al cambiar de pestaña (B6).
- [ ] `src/components/dashboard/Dashboard.tsx`: sustituir datos mock por `GET /cases`; etiquetar como "demo" lo que siga simulado (punto 8 de §1.2).
- [ ] `src/components/map/MeasureTool.tsx` (nuevo): implementar medición real (distancia geodésica y ángulo) con cota registrada como evidencia.

### Fase 3 — Backend físico y visor de animación (1–2 semanas)

- [ ] `backend/app/physics/kinematics.py` (nuevo): funciones puras y documentadas: velocidad inicial por distancia de frenado (`v = √(2·μ·g·d)` con corrección por pendiente), tiempo de frenado, perfil de desaceleración, conversión km/h↔m/s.
- [ ] `backend/app/physics/collision.py` (nuevo): conservación de momento lineal e impacto central/excéntrico (coeficiente de restitución), delta-V, energía disipada; salida con rango de incertidumbre.
- [ ] `backend/app/physics/trajectory.py` (nuevo): muestreo temporal de poses `(t, x, y, ψ, v)` a paso fijo (p. ej. 20–50 ms) hacia atrás y hacia delante desde el punto de impacto.
- [ ] `backend/app/physics/geo.py` (nuevo): proyección WGS84 ↔ plano métrico local (ENU/UTM) para operar en metros.
- [ ] `backend/app/routers/simulation.py` (nuevo): `POST /api/v1/cases/{id}/simulate` → valida entradas, ejecuta física, devuelve trayectorias + supuestos; **sin llamar al LLM**.
- [ ] `backend/app/schemas.py`: esquemas Pydantic de `SimulationInput/Output` con unidades explícitas.
- [ ] `src/components/viewer/AnimationViewer.tsx` (nuevo): 🆕 conecta las trayectorias del backend a `SampledPositionProperty`/`SampledProperty` (orientación incluida) y al `Clock` de Cesium (`multiplier`, `shouldAnimate`); sustituye el `setInterval` de 900 ms de `App.tsx`.
- [ ] 🆕 `src/components/viewer/cesium/TrajectoryTrails.tsx` (nuevo): estelas de trayectoria, marcador de impacto y huellas de frenado como polilíneas con medidas visibles.
- [ ] 🆕 `src/components/viewer/cesium/CameraPresets.ts` (nuevo): vistas predefinidas (cenital norte-arriba, conductor V1/V2, orbital sobre el impacto) y captura de imagen para el informe.
- [ ] `src/components/layout/Timeline.tsx` (nuevo): timeline en tiempo real (s), con marcador de impacto **derivado del cálculo**, no del texto fijo "00:03.38".
- [ ] `src/App.tsx`: botón "Generar simulación" (habilitado solo si `ready === true` por **datos completos**, no por defecto) que llama al endpoint y alimenta el visor.
- [x] 🆕 ~~`Viewer3D.tsx` con three.js~~: descartado; Cesium cubre la vista 3D.
- [ ] 🆕 `src/components/viewer/cesium/ExportSnapshot.ts` (nuevo): exportar fotogramas y lámina cenital para `reports.py`.

### Fase 4 — Trazabilidad, informe y calidad (1 semana)

- [ ] `backend/app/models.py` + `schemas.py`: `FieldProvenance {source, quote, page, user, timestamp}` en cada dato de entrada.
- [ ] `backend/app/routers/reports.py` (nuevo): generar informe PDF/DOCX con datos de entrada, fuentes, fórmulas, supuestos, incertidumbre y versión del software.
- [ ] `src/App.tsx` (`exportReport`): reemplazar el TXT de 5 líneas por la descarga del informe del backend.
- [ ] `backend/tests/test_physics.py` (nuevo): casos de verificación contra problemas resueltos de literatura.
- [ ] `backend/tests/test_assistant.py` (nuevo): contrato de respuesta, `buildItems` portado, truncamiento de JSON y reintentos.
- [ ] `src/**/*.test.ts(x)` (nuevo): pruebas de store, `applyActions` y del inspector con Vitest.
- [ ] `.github/workflows/ci.yml` (nuevo): `typecheck`, `build`, `pytest` y `vitest` en cada PR.

---

## Criterios de Aceptacion para la Entrega (Uso Profesional)

### A. Integridad técnica del flujo
- [ ] Un solo backend, un solo contrato de API y un solo cliente HTTP; `grep` no encuentra `/ai/chat` ni `assistantApi`.
- [ ] `pnpm typecheck`, `pnpm build` y `pytest` pasan en limpio desde un clon nuevo siguiendo el README.
- [ ] En local, `/api/*` llega al backend (proxy configurado) y el front corre sin errores en consola.
- [ ] Los datos que el perito captura (mapa, formulario, chat) terminan en **el mismo estado** y el progreso del expediente refleja ese estado real.
- [ ] Cada acción del asistente (`set_speed`, `move_vehicle`, …) modifica el mapa/inspector de forma visible y reversible (undo).
- [ ] Las escenas y poses persisten tras recargar la página.

### B. Precisión cinemática (estándares de reconstrucción de colisiones)
- [ ] Unidades SI explícitas en toda la API y la UI; conversión km/h↔m/s probada.
- [ ] La velocidad inicial por huella de frenado usa la fórmula estándar `v = √(2·μ·g·d)` (con término de pendiente) y **coincide con ejemplos resueltos de la literatura** (p. ej. Baker/Fricke, Northwestern Traffic Institute, o tablas SAE) dentro de tolerancia documentada.
- [ ] Coeficiente de fricción **seleccionable por tipo de superficie y condición** (seco/mojado), con rango (mín–máx) y fuente; no valores únicos ocultos.
- [ ] Conservación de momento y energía verificada en pruebas unitarias; coeficiente de restitución declarado.
- [ ] Toda salida numérica incluye **rango de incertidumbre** (mínimo–máximo) y el método usado. Se prohíbe presentar un valor único sin rango.
- [ ] La conversión lat/lng ↔ metros usa proyección local y se valida contra distancias medidas (error documentado, p. ej. < 1 %).
- [ ] La escala de los vehículos usa dimensiones reales; el usuario puede cargar dimensiones por marca/modelo y el valor queda registrado.
- [ ] Muestreo de la trayectoria con paso de tiempo fijo, configurable y documentado; la animación **interpola**, no salta entre escenas.

### C. Baremos y datos de referencia
- [ ] Las tablas de fricción, masas y dimensiones utilizadas están **referenciadas** (norma, manual o publicación) y versionadas.
- [ ] Cualquier "baremo" institucional (p. ej. criterios de CESVI) se incorpora como **datos configurables con su fuente**, no como constantes en código. *Nota: este informe no pudo verificar qué baremos concretos exige tu cliente; confírmalo con tu asesor/institución antes de fijarlos.*
- [ ] La simulación no usa valores por defecto silenciosos: si falta un dato, bloquea o lo marca explícitamente como **supuesto**.

### D. Trazabilidad del dictamen
- [ ] Cada dato de entrada guarda **origen** (perito / PDF con cita y página / IA / valor por defecto), usuario y fecha.
- [ ] Los datos extraídos por IA solo se aceptan con **cita textual validada por código** (comportamiento actual de `documents.py`, ampliado a vehículos y dinámica).
- [ ] El LLM **no** produce valores numéricos de cálculo: solo extrae, guía y propone acciones validadas por esquema.
- [ ] Se registran versión de la aplicación, versión del motor físico, entradas y salidas de cada simulación; es **reproducible** con la misma entrada.
- [ ] El informe incluye datos de entrada, fórmulas, supuestos, incertidumbre, limitaciones y **aviso de que la simulación es una herramienta de apoyo y no sustituye el juicio pericial**.
- [ ] Log de auditoría inmutable de cambios al expediente (quién, cuándo, qué).

### E. Calidad de producción
- [ ] Ningún dato simulado/mock se muestra como real (Dashboard, tiempos, métricas).
- [ ] Secretos (`GEMINI_API_KEY`, `GROQ_API_KEY`) solo en servidor; rotación documentada; ninguno en el repo ni en el historial.
- [ ] Persistencia en BD (no `Map` en memoria); migraciones versionadas (Alembic) para pasar de SQLite a un motor de producción.
- [ ] Validación de entradas con esquemas (Pydantic/Zod), límites de tamaño de subida de PDF y rate limiting en el endpoint de IA.
- [ ] Cumplimiento de uso de **Nominatim/OSM** (identificación, caché, límite de peticiones) o migración a un proveedor con SLA; atribución de OSM visible.
- [ ] Protección de datos personales del expediente (LFPDPPP en México si aplica): acceso autenticado, cifrado en tránsito y política de retención.
- [ ] Accesibilidad básica (teclado y contraste) y comportamiento responsivo verificados.
- [ ] Cobertura mínima acordada (sugerido: ≥ 80 % en `physics/`, ≥ 60 % global) y CI obligatorio en cada PR.
- [ ] Repositorio limpio: sin binarios pesados, sin `__pycache__`, un solo lockfile, documentación de arranque y de decisiones.

### G. 🆕 Visor Cesium (migración y rendimiento)
- [ ] Paridad funcional verificada contra Leaflet: colocar, mover, rotar, escalar, eliminar, deshacer/rehacer, medir y buscar ubicación.
- [ ] Renderizado bajo demanda activo: GPU/CPU en reposo cercana a cero cuando no se edita ni reproduce.
- [ ] Presupuesto de rendimiento documentado y cumplido en el equipo objetivo (p. ej. ≥ 30 fps con 2 vehículos y 50 objetos).
- [ ] Carga inicial del chunk de Cesium diferida; peso del bundle principal medido antes y después de la migración.
- [ ] Sin fugas: al desmontar el visor se destruyen entidades, listeners y `Viewer` (probado con navegación repetida).
- [ ] Token de datos base no expuesto de forma abusable (restricciones de dominio o proxy) y atribuciones de Cesium/OSM/terreno visibles.
- [ ] Datos de terreno y edificios etiquetados en la UI y el informe como **contexto visual**, no como medición; las cotas del dictamen provienen del levantamiento en sitio.
- [ ] Ninguna decisión pericial depende de alturas o posiciones tomadas del globo sin verificación; el error esperado del terreno/ortofoto se declara.
- [ ] Orientación y rumbo de los modelos coinciden con el marco ENU del backend (prueba con vehículo orientado al norte, este y 45°).
- [ ] Respaldo funcional: si no hay WebGL o red de tiles, el sistema degrada a vista 2D (o Leaflet) sin perder datos.

### F. Prueba de aceptación de extremo a extremo (demo)
- [ ] Caso de prueba documentado: un perito captura ubicación, dos vehículos, velocidad/frenado e impacto (por mapa, formulario y chat) → pulsa "Generar simulación" → el visor Cesium reproduce la animación con tiempo real → se exporta un informe con trazabilidad completa → los resultados coinciden con un **ejercicio resuelto a mano** dentro de la tolerancia declarada.

---

## Anexo — Resumen de rutas hoy vs. objetivo

| Función | Frontend llama hoy | Node (`server/`) | FastAPI (`backend/`) | Objetivo |
|---|---|---|---|---|
| Chat (panel activo) | `POST /api/ai/chat` | ✅ | ❌ (existe `/ai/chat` sin `/api`) | `POST /api/v1/assistant/chat` |
| Chat (panel huérfano) | `POST /api/assistant/chat` | ❌ | ❌ | eliminar |
| Caso | `GET /api/cases/:id` | ✅ (auto-crea) | ❌ (`/api/v1/cases/{id}`, 404 si no existe) | `GET /api/v1/cases/{id}` |
| Escenas CRUD | `/api/cases/:id/scenes`, `/api/scenes/:id` | ✅ | ❌ | implementar en FastAPI |
| Simulación | — | ❌ | ❌ | `POST /api/v1/cases/{id}/simulate` |
| Documentos PDF | — (sin UI) | ❌ | ✅ `/api/v1/cases/{id}/documents`, `/documents/{id}/extract` | conectar a UI de evidencia |

## 🆕 Anexo B — Riesgos de la migración a Cesium

| Riesgo | Mitigación |
|---|---|
| Bundle y carga inicial pesados | `import()` dinámico, `vite-plugin-cesium`, medir antes/después. |
| Dependencia de servicios de datos (token, cuotas, términos) | Proxy en backend, caché, verificación de términos vigentes, plan de contingencia 2D. |
| Mezclar coordenadas globales y marco local | Toda la física en ENU; conversión única y probada en `geo.py` y en el visor. |
| Equipos sin buena GPU | Calidad adaptativa y modo edición ligero. |
| Regresiones al reemplazar Leaflet | Bandera `VITE_VIEWER` e interfaz común hasta alcanzar paridad. |
| Alcance iTwin | Fuera de alcance; solo se reutiliza el patrón de 3D Tiles con propiedades. |

---

## 🆕 Anexo C — Decisión de backend y separación en componentes

### C.1 Decisión: conservar FastAPI, retirar Node

| Criterio | FastAPI (`backend/`) | Node (`server/`, `api/`) |
|---|---|---|
| Base de datos y migraciones | ✅ SQLAlchemy, modelos de caso/documento/extracción | ❌ `Map` en memoria |
| PDFs y extracción con cita validada | ✅ | ❌ |
| Física (numpy/scipy) | ✅ natural en Python | ⚠️ posible, más costoso de verificar |
| Contrato tipado → frontend | ✅ OpenAPI → `openapi-typescript` | ❌ contrato manual |
| Tests existentes | ✅ `backend/tests/test_api.py` | ❌ ninguno |
| Lógica reutilizable | — | ✅ `buildItems`, `evaluate`, `simulate`, `SKIP_RE`, retry y fallback |

**Condición de la decisión:** si nadie del equipo programa Python, reconsiderar (la física tendría que ir en TypeScript y se pierde la generación automática de tipos).
**Despliegue (decisión):** FastAPI **sí** se despliega en Vercel; lo que no persiste en serverless es SQLite y el disco local. Decisión: **frontend y FastAPI en Vercel (dos proyectos) + Postgres en Neon**. Detalle, tareas y criterios en el Anexo C.7. Alternativa de respaldo: Render (web service gratuito) + Neon.

### C.2 Estructura objetivo del backend

```
backend/app/
├── main.py                  # solo ensamblado de routers y middlewares
├── core/                    # config.py, database.py, exceptions.py, logging.py
├── models/                  # case.py, scene.py, vehicle.py, evidence.py, provenance.py, llm_log.py
├── schemas/                 # un archivo Pydantic por dominio
├── repositories/            # acceso a BD; los routers no usan db.query
├── routers/                 # delgados: validar → servicio → responder
│   ├── cases.py  scenes.py  vehicles.py  documents.py
│   ├── assistant.py  simulation.py  reports.py
├── services/
│   ├── llm/                 # providers/gemini.py, providers/groq.py, cache.py, prompts.py, client.py
│   ├── assistant/           # checklist.py, actions.py, progress.py
│   ├── extraction/          # pdf.py, quote_validation.py
│   └── reporting/           # pdf_report.py, provenance.py
└── physics/                 # funciones puras, SIN FastAPI ni SQLAlchemy
    ├── geo.py  kinematics.py  collision.py  trajectory.py  friction_tables.py
```

**Reglas de separación:**
1. `physics/` no importa nada de web ni de BD (se prueba en segundos y es lo que revisará un perito).
2. Los routers no contienen reglas de negocio ni consultas SQL.
3. Ningún servicio guarda estado en atributos de instancia compartidos entre peticiones.
4. El LLM nunca llama a `physics/`; solo propone acciones que se validan por esquema.

### C.3 Estructura objetivo del frontend

```
src/
├── store/                   # caseStore.ts
├── api/                     # client.ts + tipos generados desde OpenAPI
├── features/
│   ├── viewer/              # ViewerContainer, cesium/*, leaflet/* (temporal)
│   ├── catalog/             # CatalogMenu.tsx, catalogData.ts, materials.ts
│   ├── inspector/           # VehicleInspector.tsx, ObjectInspector.tsx
│   ├── timeline/            # Timeline.tsx, PlaybackControls.tsx
│   ├── location/            # LocationSearch.tsx
│   ├── assistant/           # AssistantPanel, hooks, applyActions.ts
│   ├── dashboard/           # Dashboard.tsx, CaseList.tsx
│   └── report/              # exportReport.ts
├── components/ui/           # Button, Icon, ToolButton
└── App.tsx                  # solo composición (meta: < 150 líneas)
```

### C.4 Checklist archivo por archivo (separación)

**Backend — consolidar y portar**
- [ ] `backend/app/services/assistant/checklist.py` (nuevo): portar `buildItems`, `evaluate` y `simulate` desde `server/index.js`, con el contexto tipado (`location`, `vehicles[]`, `impact`).
- [ ] `backend/app/services/assistant/actions.py` (nuevo): esquema Pydantic de acciones permitidas (`set_speed`, `set_braking`, `rotate_element`, `move_vehicle`, `set_impact_point`, `focus_scene_area`…); descartar acciones con `vehicleId` inexistente.
- [ ] `backend/app/services/assistant/progress.py` (nuevo): omisiones persistidas en BD (sustituye `skips` en memoria) y `SKIP_RE`.
- [ ] `backend/app/services/llm/providers/gemini.py` y `groq.py` (nuevos): una función por proveedor, sin estado compartido.
- [ ] `backend/app/services/llm/client.py` (nuevo): cadena de respaldo Gemini → Groq y reintentos con espera (portado de `withRetry`); devuelve un objeto de resultado por llamada.
- [ ] `backend/app/services/llm/cache.py` y `prompts.py` (nuevos): separar caché y prompts de `llm.py`.
- [ ] `backend/app/services/llm.py`: eliminar tras la partición (≈300 líneas).
- [ ] `backend/app/services/extraction/pdf.py` y `quote_validation.py` (nuevos): mover la lectura de PDF y la validación de citas fuera de los routers.
- [ ] `backend/app/routers/documents.py` y `cases.py`: adelgazar; mover consultas a `repositories/`.
- [ ] `backend/app/routers/assistant.py`: una sola ruta, historial persistido por caso (últimos N mensajes) en lugar de `Map`.
- [ ] `backend/app/repositories/*.py` (nuevos): `cases.py`, `scenes.py`, `vehicles.py`, `documents.py`.
- [ ] `backend/app/core/*.py`: mover `config`, `database`, `exceptions`; actualizar imports.
- [ ] `backend/tests/test_checklist.py` y `test_actions.py` (nuevos): pruebas de la lógica portada (incluye el bug B1 como caso de regresión).
- [ ] `server/`, `api/[...path].js`, `vercel.json` (rewrites de `/api`): retirar al terminar el port y actualizar el despliegue.

**Frontend — partir `App.tsx`**
- [ ] `src/features/catalog/catalogData.ts` (nuevo): mover `catalogMenus` y `ribbonGroups` (datos puros).
- [ ] `src/features/catalog/materials.ts` (nuevo): `getMaterialType`, `getCatalogItemKind`, `getDroppedItemIcon`.
- [ ] `src/features/catalog/CatalogMenu.tsx` (nuevo): extraer el componente.
- [ ] `src/features/location/LocationSearch.tsx` (nuevo): extraer búsqueda Nominatim con debounce y `AbortController`.
- [ ] `src/features/dashboard/Dashboard.tsx` (nuevo): extraer; conectar a `GET /cases`.
- [ ] `src/features/timeline/Timeline.tsx` y `PlaybackControls.tsx` (nuevos): extraer el bloque `.timeline` y el atajo de teclado de navegación.
- [ ] `src/features/inspector/VehicleInspector.tsx` (nuevo): inspector controlado (reemplaza el bloque hardcodeado).
- [ ] `src/features/assistant/applyActions.ts` (nuevo): función **pura** `(estado, acciones) → estado`; se prueba sin React.
- [ ] `src/features/viewer/ViewerContainer.tsx` y `viewerApi.ts` (nuevos): interfaz común (`addVehicle`, `moveEntity`, `setPose`, `flyTo`, `pick`, `measure`).
- [ ] `src/api/client.ts` (nuevo) y `src/api/schema.d.ts` (generado): tipos desde OpenAPI (`openapi-typescript`); reemplazan `lib/api.ts` y `lib/assistantApi.ts`.
- [ ] `src/store/caseStore.ts` (nuevo): estado único con selectores.
- [ ] `src/App.tsx`: dejar solo composición; borrar duplicados de `Icon`, `Button`, `ToolButton`, `VehicleSprite`, tipos.
- [ ] `package.json`: scripts `gen:api` (OpenAPI → TS), `typecheck`, `test`.

### C.5 Orden recomendado (sin romper lo existente)

1. Fase 0 (limpieza del repo) y proxy de Vite.
2. Port de `checklist/actions/progress` a FastAPI con tests; corregir el contrato del contexto (B1).
3. Generar tipos desde OpenAPI y eliminar `assistantApi.ts`.
4. Crear el store y partir `App.tsx` **sin cambiar aún el visor**.
5. Escribir `physics/` con tests, en paralelo con el paso 4.
6. Migrar a Cesium detrás de `VITE_VIEWER` hasta lograr paridad.
7. Retirar Node y Leaflet.

### C.6 Criterios de aceptación de la separación
- [ ] `App.tsx` < 150 líneas y sin lógica de negocio.
- [ ] Ningún archivo de `routers/` supera ~150 líneas ni contiene consultas SQL.
- [ ] `physics/` no importa `fastapi`, `sqlalchemy` ni `httpx` (verificado por test o por lint de imports).
- [ ] `applyActions` y `checklist` tienen pruebas unitarias sin dependencias de UI ni de red.
- [ ] Los tipos del frontend se generan desde OpenAPI; no existen tipos de contrato escritos a mano.
- [ ] Dos personas pueden trabajar en paralelo (visor / backend físico) sin tocar los mismos archivos.

### C.7 🆕 Despliegue gratuito: Vercel + Neon

**Arquitectura de despliegue**

```
Navegador ──► Vercel Proyecto 1 (frontend Vite, raíz del repo)
     │
     └──────► Vercel Proyecto 2 (FastAPI, directorio raíz: backend/)
                    │
                    └──► Neon (Postgres, plan gratuito)
```

**Hechos verificados en la documentación (jul-oct 2026; reconfirmar antes de entregar)**
- FastAPI se despliega en Vercel sin configuración y se convierte en una sola Vercel Function; aplican los límites de funciones (tamaño máx. de funciones Python: 500 MB sin comprimir).
- Neon gratuito: 0.5 GB y 100 CU-hours por proyecto al mes, sin tarjeta, cómputo con escala a cero tras ~5 min de inactividad.

**Puntos a verificar antes de empezar (no confirmados en esta auditoría)**
- [ ] Archivo de entrada exacto que Vercel reconoce con la estructura `backend/app/main.py` (ajustar con un archivo de entrada o configuración si hace falta).
- [ ] **Límite de duración de las funciones en el plan gratuito.** Si la simulación excede ese límite, pasar al plan alterno (Render + Neon) o dividir el cálculo.
- [ ] Soporte de respuestas en streaming (SSE) del chat en funciones serverless; si no es adecuado, usar respuesta JSON (ya contemplado con `stream: false`).
- [ ] Plan gratuito vigente de almacenamiento de objetos, **solo si** se debe conservar el PDF original.

**Checklist de tareas**
- [ ] `backend/requirements.txt`: añadir el driver de Postgres (`psycopg[binary]`) y `alembic`; fijar versiones.
- [ ] `backend/app/core/config.py`: `DATABASE_URL` obligatorio por entorno (sin valor SQLite por defecto en producción); ajustar `ALLOWED_ORIGINS` al dominio del frontend.
- [ ] `backend/app/core/database.py`: usar la cadena **con pooler** de Neon y `NullPool` en entorno serverless; quitar `check_same_thread` fuera de SQLite.
- [ ] `backend/app/main.py`: eliminar `Base.metadata.create_all` del `lifespan`; las tablas se crean con migraciones.
- [ ] `backend/alembic/` + `alembic.ini` (nuevos): migración inicial con `cases`, `documents`, `document_pages`, `llm_cache`, `llm_logs`, `extractions` y las tablas nuevas (`scenes`, `vehicles`, `evidence`…).
- [ ] `backend/app/routers/cases.py` (`upload_document`): dejar de escribir el PDF en `UPLOAD_DIR`; procesar en memoria y guardar solo el texto por página (o subir el original a almacenamiento externo si se exige conservarlo).
- [ ] `backend/app/models/document.py`: `file_path` pasa a ser opcional o a guardar la URL del objeto externo.
- [ ] `backend/vercel.json` (nuevo) o configuración del proyecto: entrada de la app, versión de Python y duración máxima de la función.
- [ ] `vercel.json` (raíz): mantener solo el build y el rewrite SPA del frontend; **eliminar** el rewrite que apuntaba `/api` al servidor Node.
- [ ] `api/[...path].js`, `server/`: eliminar al terminar el port (ya previsto en C.4).
- [ ] `.env.example` (raíz): `VITE_API_BASE_URL` apunta a la URL del proyecto backend (con `/api/v1`).
- [ ] `backend/.env.example` (nuevo): `DATABASE_URL`, `ALLOWED_ORIGINS`, `GEMINI_API_KEY`, `GROQ_API_KEY` (solo servidor).
- [ ] Panel de Vercel: variables de entorno por proyecto (Production/Preview) y dominios; **ninguna clave con prefijo `VITE_`** salvo valores públicos.
- [ ] `README.md`: pasos de despliegue, cómo ejecutar migraciones contra Neon y cómo "despertar" la base antes de una demo.
- [ ] `.github/workflows/ci.yml`: añadir paso de migraciones contra una base de prueba y `pytest` con Postgres (no solo SQLite).
- [ ] Prueba de humo posterior al despliegue: `GET /api/v1/health`, crear caso, subir PDF, chat y simulación desde el dominio publicado.

**Criterios de aceptación del despliegue**
- [ ] No existe ninguna dependencia de disco local ni de estado en memoria entre peticiones.
- [ ] Las migraciones se aplican de forma reproducible en una base Neon vacía.
- [ ] CORS permite únicamente el dominio del frontend (y previews si se decide).
- [ ] La primera petición tras inactividad (arranque en frío de la función y de Neon) funciona y su latencia está medida y documentada.
- [ ] La simulación completa termina dentro del límite de duración del plan; si no, existe un plan alterno documentado.
- [ ] Respaldo exportable de la base (volcado periódico), porque el plan gratuito tiene ventana de restauración corta (~6 h) y 0.5 GB.
- [ ] Costos y cuotas de Vercel, Neon y proveedores de IA revisados y documentados con fecha de verificación.

**Plan alterno (si se excede el límite de duración o hay problemas con streaming):** FastAPI como servicio web en Render (gratuito, se apaga tras 15 min sin tráfico y tarda hasta ~1 min en despertar, sistema de archivos efímero) con la **misma base en Neon**. No usar el Postgres gratuito de Render (expira a los 30 días). El cambio se limita a variables de entorno y al `VITE_API_BASE_URL`.
