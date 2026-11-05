# CAMBIOS.md — Resolución de Bug de Reubicación y Modelo Cartográfico Relativo

## 1. Causa Raíz del Bug

Tras la auditoría del código, se identificaron cuatro factores estructurales que provocaban que solo la Escena 01 ("Inicio") se moviese al buscar una nueva dirección y que las Escenas 02, 03 y 04 regresaran al Zócalo de la CDMX:

1. **Inexistencia de un Estado Único para la Ubicación:** En `src/App.tsx`, el visor calculaba el centro con la condición:
   ```ts
   const mapViewCenter = mapViewMode === "location" ? mapCenter : [IMPACT_POSITION.lat, IMPACT_POSITION.lng]
   ```
   Donde `mapViewMode` solo era `"location"` en la Escena 01 (`selectedFrame === 0`). Al activar las Escenas 02, 03 o 04, el centro forzado era `IMPACT_POSITION`, el cual estaba fijado de forma dura a las coordenadas del Zócalo (`19.43262, -99.13308`).
2. **Coordenadas Absolutas sin Vínculo Geográfico:** Los vehículos (V1, V2), las evidencias (E1, E2), el punto de impacto y los objetos del catálogo se almacenaban en `src/hooks/useScenarioItems.ts` únicamente con coordenadas geográficas fijas (`lat`, `lng`). Al cambiar de dirección en el buscador, solo se mutaba `mapCenter` de la Escena 01, dejando a todos los elementos en sus latitudes y longitudes originales del Zócalo.
3. **Falta de Sincronización en Cambio de Pestañas:** Al alternar entre escenas no se invocaba `map.invalidateSize()` ni un recentrado dinámico con repintado garantizado desde el estado.
4. **Acoplamiento de Selección:** La selección del panel lateral derecho y el reproductor del timeline mantenían índices desalineados con la reubicación física de la escena.

---

## 2. Archivos Modificados y Creados

| Archivo | Tipo | Descripción del cambio |
|---|---|---|
| `src/lib/geo.ts` | **Nuevo** | Módulo de proyección plana local (ENU) con factor de 111,320 m por grado de latitud y escala `cos(lat)` para longitud. Implementa `toLatLng`, `toOffsetM`, `distanceMeters`, `offsetDistanceMeters`. |
| `src/lib/geo.test.ts` | **Nuevo** | Pruebas unitarias nativas (`node:test`) que validan round-trip con error $< 0.01\text{ m}$, bidireccionalidad e invarianza de distancias entre vehículos. |
| `src/lib/migration.ts` | **Nuevo** | Migrador de expedientes históricos y almacenamiento `localStorage` (`migrateLegacyCase`, `loadSavedCase`, `saveCase`), convirtiendo coordenadas absolutas a offsets métricos. |
| `src/components/common/DebugPanel.tsx` | **Nuevo** | Panel HUD de depuración activable vía `?debug=1`, con visualización en tiempo real del ancla, escena activa, coordenadas de V1/V2/E1/E2, distancia métrica y botón cíclico *"Probar reubicación"*. |
| `src/types/scenario.ts` | **Modificado** | Incorporación de tipos `OffsetM`, `RelativeVehicle`, `RelativeEvidence` y constantes `DEFAULT_VEHICLE_OFFSETS`, `DEFAULT_IMPACT_OFFSET`, `DEFAULT_EVIDENCE_OFFSETS`. |
| `src/hooks/useScenarioItems.ts` | **Modificado** | Refactorización al modelo métrico relativo: almacena offsets `{x, y}` y deriva reactivamente las coordenadas WGS84 para Leaflet mediante `toLatLng(anchor, offset)`. Autosave automático en `localStorage`. |
| `src/hooks/useLocationSearch.ts` | **Modificado** | Integración de `searchAddress` para geocodificación directa de textos en Enter con rechazo y manejo seguro de errores. |
| `src/App.tsx` | **Modificado** | Centralización de `anchor` como única fuente de verdad; flujo completo de reubicación con toast; `invalidateSize()` y recentrado al cambiar de escena; reseteo de selección a "Sin selección" y timeline a escena 0. |
| `src/components/map/GeoMapOverlay.tsx` | **Modificado** | Renderizado del pin de ubicación en Escena 01 junto con los vehículos y evidencias del siniestro en su posición reubicada. |
| `src/hooks/useAssistantChat.ts` | **Modificado** | Sincronización reactiva del card de selección ("Sin selección" cuando no hay elemento activo). |
| `package.json` | **Modificado** | Configuración del script `pnpm test` apuntando a `node --test src/lib/geo.test.ts`. |

---

## 3. Nuevo Flujo de Reubicación

1. **Búsqueda / Geocodificación:**
   - El usuario ingresa una dirección en el buscador (ej. *"Avenida Sebastián Lerdo de Tejada, Toluca"*) o selecciona una sugerencia.
   - Nominatim devuelve las coordenadas; se procesan con `parseFloat(lat)` y `parseFloat(lon)`.
   - **Manejo de errores:** Si la búsqueda no arroja resultados o la red falla, se despliega una alerta visual y **no se modifica** el `anchor`.
2. **Actualización del Ancla Única (`setAnchor`):**
   - Se actualiza el estado global `anchor: { lat, lng }`. Ninguna escena posee coordenadas independientes.
3. **Reubicación Automática de Elementos:**
   - Dado que los vehículos, huellas, evidencias y objetos están modelados como desplazamientos $\{x, y\}$ en metros respecto al ancla, la función `toLatLng(newAnchor, offset)` los proyecta inmediatamente sobre la nueva ubicación.
   - **Conservación física:** La distancia en metros entre V1, V2 y los indicios se conserva de forma exacta.
4. **Navegación del Visor y Animación:**
   - Se ejecuta `mapInstance.flyTo([lat, lng], zoom)` suavemente.
   - El pin de ubicación de la Escena 01 se posiciona en el nuevo ancla.
5. **Reinicio de Estado UI:**
   - La selección del panel derecho se reinicia a *"Sin selección"*.
   - El timeline se detiene y regresa a la Escena 01 (00:00).
6. **Persistencia (Autosave):**
   - El expediente se serializa automáticamente en `localStorage` bajo la clave `cesvi_expediente_EXP-0248`.
7. **Notificación Toast:**
   - Se emite el mensaje: `Escena reubicada: [dirección] (lat, lng)`.
8. **Cambio de Pestañas Multiescena:**
   - Al cambiar a cualquier pestaña (01 Inicio, 02 Aproximación, 03 Impacto, 04 Posición final), se ejecuta `mapInstance.invalidateSize()` y `setView([anchor.lat, anchor.lng], zoom)`, garantizando que el mapa se pinte de inmediato con los marcadores actualizados.

---

## 4. Guía de Prueba y Verificación

### A. Ejecución de Pruebas Unitarias
Ejecutar en la terminal:
```bash
pnpm test
```
Verificar que los 4 tests pasen con error $< 0.01\text{ m}$ en round-trip y comprobación de conservación de distancias.

### B. Verificación de Compilación y Tipos
```bash
pnpm typecheck
pnpm build
```

### C. Prueba Interactiva en el Frontend
1. Abrir la aplicación con el parámetro de depuración: `http://localhost:8443/?debug=1`.
2. Observar el panel **⚡ CESVI DEBUG HUD** en la esquina inferior izquierda.
3. En la barra superior, buscar `"Avenida Sebastián Lerdo de Tejada, Toluca"` y presionar Enter (o pulsar el botón *"📍 Probar reubicación"* del panel HUD).
4. Comprobar:
   - Aparece el toast: `Escena reubicada: Avenida Sebastián Lerdo de Tejada, Toluca (19.28882, -99.65568)`.
   - El mapa vuela a Toluca.
   - En el panel HUD, el ancla muestra `19.28882, -99.65568`.
   - V1, V2, E1, E2 aparecen en Toluca (latitudes $\approx 19.289$, longitudes $\approx -99.655$).
   - La distancia V1 ↔ V2 se mantiene constante en `99.33 m`.
   - El panel derecho muestra *"Sin selección"*.
5. Cambiar entre las pestañas **01 Inicio**, **02 Aproximación**, **03 Impacto** y **04 Posición final**:
   - En todas las escenas el mapa permanece centrado en Toluca.
   - Ninguna escena vuela de regreso al Zócalo de CDMX.
6. Recargar la página (`F5`):
   - La aplicación recupera la ubicación y posiciones guardadas desde `localStorage`.
