# Progreso de Implementación - CESVI

## Estado General
- **Punto actual**: Título CESVI en pestaña y atribución OpenStreetMap (Completado)
- **Rama**: `temporal`
- **Commits recientes**:
  1. `e971115 feat(wizard): coach marks por escena`
  2. `86e2af2 feat(wizard): DebugPanel con saltar a paso X`
  3. `8e75c68 docs: CAMBIOS.md con arquitectura y diagrama`
  4. `2de672f docs(progress): registrar PROGRESO.md de Fase E`
  5. Siguiente commit: `fix(ui): título CESVI en pestaña y atribución OpenStreetMap`

---

## Tarea: Título CESVI en pestaña y atribución OpenStreetMap
- [x] **Completado**:
  - `index.html`: `<title>CESVI · Reconstrucción vial</title>` y meta tags.
  - `.figma/make/site.json` y `vite.config.ts`: título `"CESVI · Reconstrucción vial"`.
  - Favicon: archivo `public/favicon.svg` con pictograma vehicular y franja roja CESVI.
  - `MapCanvas.tsx`: `attributionControl={true}` explícito y `attribution` con enlaces a `https://www.openstreetmap.org/copyright` con `target="_blank" rel="noopener noreferrer"`.
  - `src/index.css`: estilo legible y con `z-index: 1000` para `.leaflet-control-attribution`.
  - `RibbonBar.tsx` y `StepInicio.tsx`: notas de atribución a OpenStreetMap y Nominatim con enlaces en la interfaz.
  - `src/lib/exportUnity.ts`: creación del módulo de exportación Unity con el campo requerido `"fuente_cartografica": "© OpenStreetMap contributors (https://www.openstreetmap.org/copyright)"` en `metadata`.
  - `src/App.tsx`: inclusión de la línea de atribución cartográfica al pie del informe `.txt` y llamada a `exportUnityJson`.
  - `README.md`: sección `## 5. Créditos y Atribuciones` documentando OpenStreetMap, Nominatim y Leaflet.
- **Decisiones tomadas**:
  - No se modificaron `geo.ts`, `migration.ts`, `wizardMachine.ts` ni el núcleo del wizard.
  - El nombre de paquete `"name": "figma-make-app"` en `package.json` se mantuvo intacto ya que no es visible en la UI.
