# DECISIONES DE ARQUITECTURA Y DISEÑO TÉCNICO — PROYECTO CESVI

> **Fecha:** 25 de octubre de 2026  
> **Estado:** Aprobado / Vigente para Fase 0 y posteriores  
> **Documento maestro de referencia:** `docs/TICKET-AUDITORIA-CESVI.md`  
> **Reglas de trabajo:** `AGENTS.md`

Este documento consolida las decisiones técnicas y periciales fundamentales del sistema de simulación y peritaje vial del proyecto CESVI.

---

## 1. Backend Único: FastAPI (`backend/`)

### Decisión
El backend definitivo del proyecto es **FastAPI** (Python 3.13), ubicado en `backend/`. El servidor Node.js legacy (`server/`, `api/`) queda en modo de solo lectura/referencia durante la Fase 1 y será retirado formalmente al cierre de dicha fase con confirmación explícita.

### Justificación técnica
1. **Física determinista y análisis numérico:** Python proporciona el ecosistema estándar (`numpy`, `scipy`) para la formulación de ecuaciones cinemáticas, trayectorias e impactos mecánicos sin reimplementar bibliotecas matemáticas en JavaScript.
2. **Extracción y procesamiento documental:** El servicio ya implementa procesamiento de documentos periciales en PDF (`PyMuPDF`) con validación estricta de citas textuales y cálculo de tokens.
3. **Persistencia robusta:** Utiliza SQLAlchemy con modelos estructurados relacionales y capacidad de migración (Alembic) hacia bases de datos de producción (PostgreSQL / Neon).
4. **Contratos tipados:** FastAPI genera automáticamente el esquema OpenAPI (`/api/v1/openapi.json`), lo que permite generar tipos estáticos TypeScript para el frontend (`openapi-typescript`), evitando duplicación o desalineación de contratos.
5. **Pruebas unitarias:** Dispone de una suite de pruebas con `pytest` y fixtures para BD en memoria y emulación de endpoints.

### Estrategia de migración desde Node
Durante la Fase 1 se portarán a FastAPI las funcionalidades valiosas del servidor Node:
- Generación de lista de pendientes y validación de contexto (`buildItems`, `evaluate`, `simulate`).
- Detección de omisiones explícitas (`SKIP_RE`, `skips`).
- Cadena de resiliencia de proveedores LLM (Gemini con respaldo Groq y reintentos exponenciales).

---

## 2. Unidades y Estándares de Medición (Sistema Internacional - SI)

En concordancia con los estándares periciales de reconstrucción de hechos de tránsito, **todas las operaciones internas del motor físico y de almacenamiento de datos operan en unidades SI**:

| Magnitud | Unidad SI interna | Unidad en UI / Reportes | Regla de conversión |
|---|---|---|---|
| **Distancia / Longitud** | Metros ($m$) | Metros ($m$) | Directa (escala 1:1 real). |
| **Tiempo** | Segundos ($s$) | Segundos ($s$) o marcas mm:ss.ms | Directa. |
| **Velocidad** | Metros por segundo ($m/s$) | Kilómetros por hora ($km/h$) | $v_{\text{km/h}} = v_{\text{m/s}} \times 3.6$. La UI debe etiquetar siempre la unidad. |
| **Aceleración / Desaceleración** | Metros por segundo al cuadrado ($m/s^2$) | $m/s^2$ o fracción de $g$ ($a/g$) | $g = 9.80665\text{ m/s}^2$. |
| **Coeficiente de fricción ($\mu$)** | Adimensional ($0.0 - 1.2$) | Adimensional con rango ($\mu_{\min} - \mu_{\max}$) | Nunca un escalar único sin rango de incertidumbre ni fuente. |
| **Rumbo / Orientación ($\psi$)** | Grados sexagesimales ($^\circ$) o radianes ($rad$) | Grados sexagesimales ($0^\circ - 360^\circ$) | $0^\circ = \text{Norte}$, sentido horario ($90^\circ = \text{Este}$, $180^\circ = \text{Sur}$, $270^\circ = \text{Oeste}$). |
| **Masa** | Kilogramos ($kg$) | Kilogramos ($kg$) | Tara + carga según especificación técnica o ficha del vehículo. |
| **Energía** | Joules ($J$) | Kilojoules ($kJ$) | $E_{\text{kJ}} = E / 1000$. |

### Política de supuestos e incertidumbre
- **Prohibición de valores por defecto silenciosos:** Si falta un dato esencial (p. ej. coeficiente de fricción, distancia de frenado o peso), el sistema **no debe inventar un número predeterminado**.
- **Registro de supuestos:** Cuando un cálculo requiera una estimación no acreditada por evidencia física o documental, el valor debe marcarse explícitamente como `SUPUESTO` dentro del expediente, asociando su justificación técnica y rango de variación.
- **Salidas con incertidumbre:** Todo resultado físico pericial (velocidad calculada, energía disipada, delta-V) debe expresarse como un intervalo $[\text{valor}_{\min}, \text{valor}_{\max}]$.

---

## 3. Sistema de Coordenadas y Referencia Espacial

Para resolver la inconsistencia entre coordenadas geográficas y cálculos cinemáticos métricos:

1. **Capa Cartográfica y Visualización (Frontend):**
   - Coordenadas geográficas estándar: **WGS84** (`latitude`, `longitude` en grados decimales).
   - Visor base: Leaflet en Fases 0 y 1. Migración a CesiumJS prevista en Fase 2/3 tras lograr paridad.
   - Conversión de escala en pantalla: Proyección local métrica basada en la latitud de la escena para asegurar que las dimensiones de los vehículos (ej. 4.5 m de longitud) se representen a escala física exacta en el lienzo cartográfico.

2. **Capa de Cinemática y Física (Backend):**
   - Marco métrico local: **East-North-Up (ENU)** o plano tangente local métrico con origen $(0,0,0)$ fijado en un punto de referencia de la escena (típicamente el punto de impacto o el centro de la intersección).
   - Ejes:
     - $X$ = Este ($m$).
     - $Y$ = Norte ($m$).
     - $Z$ = Elevación ($m$, positivo hacia arriba).
   - Toda integración temporal de trayectorias, cálculo de momento lineal y desaceleración ocurre en el espacio métrico euclidiano ENU.
   - Las poses calculadas $(t, x, y, \psi, v)$ se transforman de regreso a WGS84 solo para su visualización o intercambio cartográfico.

---

## 4. Rol de la Inteligencia Artificial vs. Código Determinista

1. **Separación de responsabilidades:**
   - **El LLM (Gemini / Groq) NUNCA calcula física, cinemática ni velocidades.** El modelo actúa exclusivamente como extractor de información desde texto/PDFs, clasificador de intenciones en el chat y asistente pericial que propone acciones.
   - **Todo cálculo físico es código determinista:** Ecuaciones de frenado ($v = \sqrt{2\mu gd}$), conservación de cantidad de movimiento y muestreo temporal de trayectorias se ejecutan en módulos de Python puros, acompañados de pruebas unitarias basadas en problemas resueltos de la literatura técnica forense.
2. **Validación de acciones:** Las sugerencias del asistente de IA (`set_speed`, `move_vehicle`, `set_impact_point`) son validadas contra esquemas Pydantic/Zod antes de modificar el estado del caso o influir en la simulación.
3. **Citas textuales verificadas:** Ningún dato extraído de dictámenes por IA se considera válido si no cuenta con una cita textual verificada automáticamente contra el contenido del documento PDF fuente.

---

## 5. Estrategia de Visor y Despliegue

1. **Visor cartográfico:**
   - En **Fase 0 y Fase 1** se mantiene y estabiliza el visor existente sobre Leaflet.
   - Queda explícitamente prohibido instalar dependencias o configurar CesiumJS durante las Fases 0 y 1.
2. **Despliegue futuro (Fases posteriores):**
   - Frontend en Vercel (Proyecto 1).
   - FastAPI en Vercel o Render (Proyecto 2).
   - Base de datos relacional PostgreSQL en Neon.
   - **No se implementa infraestructura ni despliegue en Fases 0 y 1.**
3. **Gestión de secretos:**
   - Variables confidenciales (`GEMINI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`) residen única y exclusivamente en `backend/.env` o en el entorno del servidor.
   - Ninguna credencial ni clave de API se expone en el código del cliente ni se versiona en Git.
