# CESVI — Sistema de Reconstrucción Pericial y Simulación Vial

Plataforma universitaria para el peritaje y reconstrucción de hechos de tránsito terrestre. Integra captura geo-referenciada de escena sobre mapa a escala real, extracción pericial asistida por inteligencia artificial desde dictámenes en PDF y un motor físico cinemático determinista para la validación de hipótesis de colisión.

---

## 1. Arquitectura y Puertos de Desarrollo

| Componente | Directorio | Tecnología | Puerto Local Predeterminado |
|---|---|---|---|
| **Frontend** | `src/` | React 19, Vite, Tailwind CSS 4, TypeScript | `http://localhost:8443` |
| **Backend Principal** | `backend/` | FastAPI, SQLAlchemy, PyMuPDF, Python 3.13 | `http://localhost:8000` |
| **Backend Legacy (Node)** | `server/` | Express (vigente de forma temporal para portar lógica en Fase 1) | `http://localhost:3001` |

---

## 2. Requisitos Previos

- **Node.js**: v20 o superior.
- **pnpm**: v10 o superior (gestor de paquetes oficial del frontend).
- **Python**: v3.12 o v3.13 con `pip` y `venv`.

---

## 3. Puesta en Marcha Local

### 3.1 Frontend (React + Vite)

Desde la raíz del repositorio:

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (por defecto en http://localhost:8443)
pnpm dev

# Verificación de tipos estáticos
pnpm typecheck

# Compilar para producción
pnpm build
```

### 3.2 Backend (FastAPI)

Desde el directorio `backend/`:

```bash
cd backend

# Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate       # En Linux/macOS
# .venv\Scripts\activate        # En Windows PowerShell

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env            # O editar backend/.env con las claves correspondientes

# Iniciar servidor FastAPI
uvicorn app.main:app --reload --port 8000
```

#### Variables de entorno en `backend/.env`
```env
GEMINI_API_KEY=tu_clave_de_gemini
GROQ_API_KEY=tu_clave_de_groq
DATABASE_URL=sqlite:///./cesvi.db
ALLOWED_ORIGINS=http://localhost:8443,http://localhost:5173
PORT=8000
```

---

## 4. Ejecución de Pruebas y Verificaciones

### Verificación del Frontend
```bash
# Comprobación de tipos con el compilador de TypeScript
pnpm typecheck

# Verificación de empaquetado de producción
pnpm build
```

### Verificación del Backend
Con el entorno virtual activado en `backend/`:
```bash
cd backend
python -m pytest -q
```

---

## 5. Estándares y Documentos de Referencia

- **[AGENTS.md](AGENTS.md):** Reglas de oro del proyecto, convenciones de commits y directrices de desarrollo.
- **[DECISIONES.md](DECISIONES.md):** Decisiones de arquitectura técnica, unidades SI obligatorias ($m, s, m/s$), marco de coordenadas métrico local (ENU vs WGS84) y rol delimitado del LLM.
- **[docs/TICKET-AUDITORIA-CESVI.md](docs/TICKET-AUDITORIA-CESVI.md):** Hoja de ruta maestra, matriz de riesgos y checklist de fases.
