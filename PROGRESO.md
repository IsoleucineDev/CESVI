# Progreso de Implementación - CESVI

## Estado General
- **Punto actual**: Informe pericial en PDF y base para asistente IA (Completado)
- **Rama**: `temporal`
- **Commits recientes**:
  1. `e971115 feat(wizard): coach marks por escena`
  2. `86e2af2 feat(wizard): DebugPanel con saltar a paso X`
  3. `8e75c68 docs: CAMBIOS.md con arquitectura y diagrama`
  4. `2de672f docs(progress): registrar PROGRESO.md de Fase E`
  5. `c6dcd2c fix(ui): título CESVI en pestaña y atribución OpenStreetMap`
  6. Siguiente commit: `feat(export): informe pericial en PDF y base para asistente IA`

---

## Tarea 1: Visibilidad de RibbonBar, SceneTabs y Atribución
- [x] **Completado**:
  - `RibbonBar` (Mapa base, Trazado vial, Trayectoria, Medición, Señalización) y `SceneTabs` permanecen visibles en escenas 02, 03 y 04 (`!isInicio`), ocultándose únicamente en la escena 01.
  - Enlace oficial configurado en `RibbonBar.tsx`:
    `<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap</a>`

---

## Tarea 2: Informe Pericial en PDF (`src/lib/exportPdf.ts`)
- [x] **Completado**:
  - Instalación de `jspdf` y `jspdf-autotable`.
  - Implementación de `buildReportPdf(caso)` en `src/lib/exportPdf.ts` que genera y descarga `EXP-0248-informe.pdf`.
  - Encabezado institucional con membrete CESVI México, expediente EXP-0248 y fecha de emisión.
  - Ubicación del hecho con dirección, coordenadas WGS84, municipio y estado.
  - Croquis planimétrico y cinemático vectorial propio dibujado a escala con posiciones iniciales, trayectorias, punto de colisión, posiciones de reposo final, evidencias y rosa de los vientos (sin capturar Leaflet).
  - Tabla de vehículos con tipo, marca/modelo, rumbo, velocidad en km/h y m/s, posiciones inicial y final.
  - Dinámica de colisión con tiempo referencial, vehículos involucrados y zonas de daño.
  - Inventario de indicios físicos y señalización vial.
  - Notas periciales distinguiendo datos capturados vs datos estimados.
  - Pie de página en todas las hojas con atribución OpenStreetMap y numeración `Página X de Y`.
  - Manejo de "No registrado" para campos sin información y soporte de acentos/ñ en español.
  - Botón "Exportar informe" en `TopBar.tsx` y `StepPosicionFinal.tsx` condicionado a `isComplete: true`.
  - Botón independiente para exportar modelo `EXP-0248-unity.json` preservado.

---

## Tarea 3: Base para Asistente IA (`src/lib/assistantProvider.ts`)
- [x] **Completado**:
  - Definición de la interfaz `AssistantProvider` con método `suggest(context: AssistantContext): Promise<string>`.
  - Implementación determinista por defecto `GuidedAssistantProvider` ("guiada") sin llamadas a red/IA externa.

---

## Pruebas y Validación
- [x] **Completado**:
  - `src/lib/exportPdf.test.ts` añadido a `package.json` y ejecutado con `node --test`.
  - Validación completa con `pnpm typecheck && pnpm test && pnpm build`.
