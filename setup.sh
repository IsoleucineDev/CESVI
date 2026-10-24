#!/usr/bin/env bash
# setup-ia.sh
# Instala el servidor de IA (Gemini con respaldo Groq) y conecta el panel
# "Asistente pericial" (src/components/assistant) de ESTE front.
#
# Uso (desde la raíz del front, en Git Bash o WSL):
#   bash setup-ia.sh            # usa la carpeta actual
#   bash setup-ia.sh ruta/al/front
#
# Opcional: exporta GEMINI_API_KEY / GROQ_API_KEY para no escribirlas a mano.
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

say()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

backup() {
  if [ -f "$1" ] && [ ! -f "$1.bak" ]; then
    cp "$1" "$1.bak"
    warn "Respaldo creado: $1.bak"
  fi
}

# ---------------------------------------------------------------- 1. Revisión
say "Revisando el proyecto en: $ROOT"
command -v node >/dev/null || die "Falta Node.js (versión 20 o superior)."
command -v npm  >/dev/null || die "Falta npm."
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[ "$NODE_MAJOR" -ge 20 ] || die "Se necesita Node 20+ (tienes $(node -v))."
[ -f package.json ] || die "No encuentro package.json. Corre el script en la raíz del front."
[ -d src/components/assistant ] || die "No encuentro src/components/assistant."
grep -q '"vite"' package.json || warn "Este front no parece usar Vite; las variables VITE_ podrían no aplicar."

# ---------------------------------------------------------------- 2. Servidor
say "Creando server/ (Express + Gemini + respaldo Groq)"
mkdir -p server
backup server/index.js

cat > server/package.json <<'EOF_PKG'
{
  "name": "cesvi-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --env-file=.env index.js",
    "start": "node --env-file=.env index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  }
}
EOF_PKG

cat > server/.env.example <<'EOF_ENVX'
# Copia como .env y llena tus keys. NUNCA subas .env a GitHub.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
# Opcional: respaldo si Gemini falla o se agota el límite
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
FRONT_ORIGIN=http://localhost:5173
PORT=3001
EOF_ENVX

cat > server/index.js <<'EOF_SERVER'
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

const PORT = process.env.PORT || 3001;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

if (!GEMINI_KEY && !GROQ_KEY) {
  console.error("Falta GEMINI_API_KEY o GROQ_API_KEY en server/.env");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

/* ---------- Datos en memoria (se reinician al apagar el server) ---------- */
const cases = new Map();
const seedScenes = () =>
  ["Inicio", "Aproximación", "Impacto", "Posición final"].map((name, i) => ({
    id: randomUUID(),
    name,
    order: i + 1,
  }));

function ensureCase(id) {
  if (!cases.has(id)) {
    cases.set(id, {
      id,
      name: "Reconstrucción vial",
      location: "",
      scenes: seedScenes(),
    });
  }
  return cases.get(id);
}

function findScene(sceneId) {
  for (const c of cases.values()) {
    const scene = c.scenes.find((s) => s.id === sceneId);
    if (scene) return { c, scene };
  }
  return null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/cases/:id", (req, res) => res.json(ensureCase(req.params.id)));

app.get("/api/cases/:id/scenes", (req, res) => {
  const scenes = [...ensureCase(req.params.id).scenes].sort((a, b) => a.order - b.order);
  res.json(scenes);
});

app.post("/api/cases/:id/scenes", (req, res) => {
  const c = ensureCase(req.params.id);
  const { name, order } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name requerido" });
  const scene = { id: randomUUID(), name, order: order ?? c.scenes.length + 1 };
  c.scenes.push(scene);
  res.status(201).json(scene);
});

app.patch("/api/scenes/:id", (req, res) => {
  const found = findScene(req.params.id);
  if (!found) return res.status(404).json({ error: "escena no encontrada" });
  if (req.body?.name) found.scene.name = req.body.name;
  res.json(found.scene);
});

app.delete("/api/scenes/:id", (req, res) => {
  const found = findScene(req.params.id);
  if (!found) return res.status(404).json({ error: "escena no encontrada" });
  found.c.scenes = found.c.scenes.filter((s) => s.id !== req.params.id);
  res.status(204).end();
});

/* ---------- Datos requeridos: los calcula el código, no la IA ---------- */
const TOPICS = ["Ubicación", "Vehículos", "Dinámica"];
const filled = (v) => (typeof v === "string" ? v.trim() !== "" : v !== null && v !== undefined);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const SKIP_RE = /^\s*(saltar|omitir|no se pudo determinar|no lo s[eé]|no s[eé])(?=\s|[.,!?]|$)/i;

function buildItems(ctx) {
  const items = [
    {
      key: "ubicacion",
      topic: "Ubicación",
      label: "ubicación del siniestro (calle o dirección)",
      done: filled(ctx.location),
    },
  ];
  const vehicles = Array.isArray(ctx.vehicles) ? ctx.vehicles : [];
  if (vehicles.length === 0) {
    items.push({
      key: "sin_vehiculos",
      topic: "Vehículos",
      label: "vehículos involucrados (colocarlos en el mapa)",
      done: false,
    });
  }
  for (const v of vehicles) {
    const n = `vehículo ${v.id}`;
    items.push(
      { key: `${v.id}.tipo`, topic: "Vehículos", label: `tipo del ${n} (Automóvil, Carga, Motocicleta u Otro)`, done: filled(v.type) },
      { key: `${v.id}.velocidad`, topic: "Dinámica", label: `velocidad estimada en km/h del ${n} antes de frenar`, done: isNum(v.speed) },
      { key: `${v.id}.frenado`, topic: "Dinámica", label: `distancia de frenado en metros del ${n}`, done: isNum(v.braking) },
      { key: `${v.id}.rumbo`, topic: "Dinámica", label: `dirección o rumbo del ${n}`, done: filled(v.heading) },
    );
  }
  items.push({
    key: "impacto",
    topic: "Dinámica",
    label: "punto de impacto (qué parte de cada vehículo chocó)",
    done: ctx.impact !== null && ctx.impact !== undefined,
  });
  return items.sort((a, b) => TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic));
}

const skips = new Map(); // caseId -> Set de claves omitidas por el perito

function evaluate(ctx, caseId) {
  const skipped = skips.get(caseId) ?? new Set();
  const items = buildItems(ctx);
  const pending = items.filter((i) => !i.done && !skipped.has(i.key));
  return {
    pending,
    progress: Math.round((100 * (items.length - pending.length)) / items.length),
    ready: pending.length === 0,
    topics: TOPICS.map((name) => ({ name, done: !pending.some((i) => i.topic === name) })),
  };
}

// Aplica las acciones al contexto en el servidor para calcular el progreso "después" del mensaje
function simulate(ctx, actions) {
  const next = structuredClone(ctx);
  const vehicles = Array.isArray(next.vehicles) ? next.vehicles : [];
  const find = (id) => vehicles.find((v) => String(v.id) === String(id));
  for (const a of actions) {
    const v = find(a?.vehicleId);
    switch (a?.type) {
      case "set_location":
        if (a.query) next.location = String(a.query);
        break;
      case "set_vehicle_type":
        if (v && a.value) v.type = String(a.value);
        break;
      case "set_speed":
        if (v && isNum(a.value)) v.speed = a.value;
        break;
      case "set_braking":
        if (v && isNum(a.value)) v.braking = a.value;
        break;
      case "rotate_element":
        if (v && a.heading) v.heading = String(a.heading);
        break;
      case "set_impact_point":
        next.impact = { lat: a.lat ?? null, lng: a.lng ?? null };
        break;
    }
  }
  return next;
}

/* ---------- Asistente de IA ---------- */
const SYSTEM = `Eres el "Asistente pericial" de CESVI. Ayudas a un perito a reconstruir un siniestro vial en el mapa.
Recibes: el estado de la escena (JSON), la lista ordenada de datos que faltan y el mensaje del perito.
Reglas:
- Extrae TODOS los datos que el perito dé en su mensaje (puede dar varios a la vez) y devuélvelos como acciones.
- La lista de faltantes es de ANTES de su mensaje: no vuelvas a pedir lo que acaba de responder.
- Después, haz UNA sola pregunta corta, en español, sobre el primer dato que siga faltando.
- Nunca inventes datos. Si el perito omite algo, acéptalo y avanza.
- Si ya no falta nada, dile que el expediente está completo y que puede generar la simulación.
- Responde SOLO con un JSON válido con esta forma:
{"answer":"texto para el chat","actions":[],"quickReplies":["opción 1","opción 2"]}
Acciones permitidas (campo "type"):
{"type":"set_location","query":"Av. Paseo de la Reforma 222"}
{"type":"set_vehicle_type","vehicleId":"...","value":"Automóvil"}   (Automóvil, Carga, Motocicleta u Otro)
{"type":"set_speed","vehicleId":"...","value":42}   (km/h)
{"type":"set_braking","vehicleId":"...","value":8.4}   (metros; 0 si no frenó)
{"type":"rotate_element","vehicleId":"...","heading":"Noreste"}   (Norte, Noreste, Este, Sureste, Sur, Suroeste, Oeste, Noroeste)
{"type":"set_impact_point"}   (sin coordenadas: el front lo coloca entre los vehículos)
{"type":"move_vehicle","vehicleId":"...","lat":0,"lng":0}
{"type":"focus_scene_area","lat":0,"lng":0,"zoom":18}
Usa solo ids de vehículo que existan en el estado. "quickReplies" es opcional, máximo 4.`;

const history = new Map(); // caseId -> [{role, content}]

async function withRetry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const transient = /respondió (429|500|502|503|504)|fetch failed/.test(err.message);
      if (!transient || i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function callGemini(messages) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    },
  );
  if (!r.ok) throw new Error(`Gemini respondió ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function callGroq(messages) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });
  if (!r.ok) throw new Error(`Groq respondió ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function parseReply(raw) {
  try {
    const o = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      answer: String(o.answer ?? ""),
      actions: Array.isArray(o.actions) ? o.actions : [],
      quickReplies: Array.isArray(o.quickReplies) ? o.quickReplies.map(String).slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

const providers = [
  GEMINI_KEY && ["gemini", callGemini],
  GROQ_KEY && ["groq", callGroq],
].filter(Boolean);

const progressInfo = (s) => ({
  progress: s.progress,
  ready: s.ready,
  topics: s.topics,
  missing: s.pending.map((i) => i.label),
});

app.post("/api/ai/chat", async (req, res) => {
  const { caseId = "EXP-0248", message, context = {} } = req.body ?? {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message requerido" });
  }

  if (!skips.has(caseId)) skips.set(caseId, new Set());
  let skippedLabel = "";
  const before = evaluate(context, caseId);
  if (SKIP_RE.test(message) && before.pending[0]) {
    skips.get(caseId).add(before.pending[0].key);
    skippedLabel = before.pending[0].label;
  }
  const state = evaluate(context, caseId);

  const pendingList = state.pending.length
    ? state.pending.map((i, n) => `${n + 1}. ${i.label}`).join("\n")
    : "(ninguno: el expediente está completo)";
  const current = {
    role: "user",
    content: [
      `ESTADO ACTUAL DE LA ESCENA (JSON):\n${JSON.stringify(context)}`,
      `DATOS QUE FALTAN, EN ORDEN (antes de este mensaje):\n${pendingList}`,
      skippedLabel ? `El perito decidió omitir: ${skippedLabel}.` : "",
      `MENSAJE DEL PERITO:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };

  const past = history.get(caseId) ?? [];
  const messages = [...past.slice(-10), current];

  let lastRaw = "";
  for (const [name, call] of providers) {
    try {
      const raw = await withRetry(() => call(messages));
      lastRaw = raw || lastRaw;
      const parsed = parseReply(raw);
      if (!parsed || !parsed.answer) throw new Error("JSON inválido o sin 'answer'");
      history.set(caseId, [
        ...past.slice(-10),
        { role: "user", content: String(message) },
        { role: "assistant", content: parsed.answer },
      ]);
      const after = evaluate(simulate(context, parsed.actions), caseId);
      return res.json({ ...parsed, ...progressInfo(after) });
    } catch (err) {
      console.warn(`[${name}] falló: ${err.message} ${err.cause?.code ?? ""}`);
    }
  }

  if (lastRaw) {
    return res.json({ answer: lastRaw, actions: [], quickReplies: [], ...progressInfo(state) });
  }
  res.status(502).json({ error: "Ningún proveedor de IA respondió" });
});

app.listen(PORT, () => console.log(`Servidor CESVI en http://localhost:${PORT}`));
EOF_SERVER

# ------------------------------------------------------------------ 3. Keys
if [ ! -f server/.env ]; then
  say "Configurando server/.env"
  FRONT_PORT="$(grep -hoE 'port:[[:space:]]*[0-9]+' vite.config.* 2>/dev/null | grep -oE '[0-9]+' | head -n1 || true)"
  FRONT_PORT="${FRONT_PORT:-5173}"
  if [ -t 0 ]; then
    read -r -p "Puerto del front [$FRONT_PORT]: " IN_PORT || true
    FRONT_PORT="${IN_PORT:-$FRONT_PORT}"
  fi

  GKEY="${GEMINI_API_KEY:-}"
  QKEY="${GROQ_API_KEY:-}"
  if [ -z "$GKEY" ] && [ -t 0 ]; then
    read -r -s -p "GEMINI_API_KEY (aistudio.google.com, Enter para omitir): " GKEY || true; echo
  fi
  if [ -z "$QKEY" ] && [ -t 0 ]; then
    read -r -s -p "GROQ_API_KEY (opcional, Enter para omitir): " QKEY || true; echo
  fi
  [ -n "$GKEY$QKEY" ] || die "Necesitas al menos una key (Gemini o Groq)."

  {
    echo "GEMINI_API_KEY=$GKEY"
    echo "GEMINI_MODEL=gemini-flash-latest"
    echo "GROQ_API_KEY=$QKEY"
    echo "GROQ_MODEL=openai/gpt-oss-120b"
    echo "FRONT_ORIGIN=http://localhost:$FRONT_PORT"
    echo "PORT=3001"
  } > server/.env
  chmod 600 server/.env 2>/dev/null || true
else
  warn "server/.env ya existe: no lo toqué."
fi

# ----------------------------------------------------------- 4. Dependencias
say "Instalando dependencias del servidor"
(cd server && npm install --no-audit --no-fund)

# ------------------------------------------------------ 5. Variables del front
say "Configurando .env.local y .gitignore"
touch .env.local
if [ -n "$(tail -c1 .env.local)" ]; then echo >> .env.local; fi
grep -q '^VITE_API_BASE_URL=' .env.local || echo "VITE_API_BASE_URL=http://localhost:3001/api" >> .env.local
grep -q '^VITE_CASE_ID=' .env.local || echo "VITE_CASE_ID=EXP-0248" >> .env.local

touch .gitignore
if [ -n "$(tail -c1 .gitignore)" ]; then echo >> .gitignore; fi
for p in "server/.env" "server/node_modules" ".env.local" "*.bak"; do
  grep -qxF "$p" .gitignore || echo "$p" >> .gitignore
done

# -------------------------------------------------- 6. Código del front (React)
say "Escribiendo el cliente y el hook del asistente"
mkdir -p src/lib src/hooks

cat > src/lib/assistantApi.ts <<'EOF_API'
export type AssistantAction = { type: string; [key: string]: unknown }

export type AssistantTopic = { name: string; done: boolean }

export type AssistantReply = {
  answer: string
  actions: AssistantAction[]
  quickReplies: string[]
  progress: number
  ready: boolean
  topics: AssistantTopic[]
  missing: string[]
}

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "")
const CASE_ID = import.meta.env.VITE_CASE_ID || "EXP-0248"

export async function sendToAssistant(
  message: string,
  context: Record<string, unknown>,
): Promise<AssistantReply> {
  const response = await fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ caseId: CASE_ID, message, context, stream: false }),
  })
  if (!response.ok) throw new Error(`El servidor respondió ${response.status}`)

  const data = await response.json()
  return {
    answer: String(data.answer ?? ""),
    actions: Array.isArray(data.actions) ? data.actions : [],
    quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies : [],
    progress: Number(data.progress ?? 0),
    ready: Boolean(data.ready),
    topics: Array.isArray(data.topics) ? data.topics : [],
    missing: Array.isArray(data.missing) ? data.missing : [],
  }
}
EOF_API

for f in src/hooks/useAssistantChat.ts src/hooks/useAssistantChat.tsx; do
  if [ -f "$f" ]; then
    [ -f "$f.bak" ] || cp "$f" "$f.bak"
    warn "Hook anterior respaldado en $f.bak"
    rm "$f"
  fi
done

cat > src/hooks/useAssistantChat.ts <<'EOF_HOOK'
import { useCallback, useRef, useState } from "react"
import { sendToAssistant } from "../lib/assistantApi"

export type ChatItem = {
  role: "user" | "assistant"
  text: string
  time?: string
}

export type SelectedElementFields = {
  vehicle: string
  speed: string
  trajectory: string
  confidence: string
}

const GREETING =
  "Hola, soy el asistente pericial. Vamos a reconstruir el siniestro paso a paso.\n\n¿En qué calle o dirección ocurrió?"

const now = () =>
  new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })

const firstMessage = (): ChatItem => ({ role: "assistant", text: GREETING, time: now() })

export function useAssistantChat(context?: Record<string, unknown>) {
  const [messages, setMessages] = useState<ChatItem[]>(() => [firstMessage()])
  const [isTyping, setIsTyping] = useState(false)
  const [chatText, setChatText] = useState("")
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [selectedElement] = useState<SelectedElementFields>({
    vehicle: "Sin selección",
    speed: "—",
    trajectory: "—",
    confidence: "—",
  })

  // Siempre usamos el contexto MÁS reciente al enviar, no uno viejo capturado por React
  const contextRef = useRef(context)
  contextRef.current = context
  const busy = useRef(false)

  const sendMessage = useCallback(
    async (override?: string) => {
      const text = (override ?? chatText).trim()
      if (!text || busy.current) return
      busy.current = true

      setChatText("")
      setQuickReplies([])
      setMessages((prev) => [...prev, { role: "user", text, time: now() }])
      setIsTyping(true)

      try {
        const reply = await sendToAssistant(text, contextRef.current ?? {})
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: reply.answer, time: now() },
        ])
        setQuickReplies(reply.quickReplies)
        // Puente con el resto de la app: acciones para el mapa y progreso del expediente
        window.dispatchEvent(new CustomEvent("cesvi:actions", { detail: reply.actions }))
        window.dispatchEvent(
          new CustomEvent("cesvi:progress", {
            detail: {
              progress: reply.progress,
              ready: reply.ready,
              topics: reply.topics,
              missing: reply.missing,
            },
          }),
        )
      } catch (error) {
        const reason = error instanceof Error ? error.message : "error desconocido"
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `No pude contactar al asistente (${reason}).`, time: now() },
        ])
      } finally {
        busy.current = false
        setIsTyping(false)
      }
    },
    [chatText],
  )

  const clearChat = useCallback(() => {
    setMessages([firstMessage()])
    setQuickReplies([])
    setChatText("")
  }, [])

  return {
    messages,
    isTyping,
    chatText,
    setChatText,
    quickReplies,
    selectedElement,
    sendMessage,
    clearChat,
  }
}
EOF_HOOK

cat > src/hooks/useAssistantActions.ts <<'EOF_ACT'
import { useEffect, useRef } from "react"
import type { AssistantAction } from "../lib/assistantApi"

// Úsalo en el componente que guarda los vehículos / el mapa:
//   useAssistantActions((actions) => applyActions(actions))
export function useAssistantActions(handler: (actions: AssistantAction[]) => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const onActions = (event: Event) => {
      const actions = (event as CustomEvent<AssistantAction[]>).detail ?? []
      handlerRef.current(actions)
    }
    window.addEventListener("cesvi:actions", onActions)
    return () => window.removeEventListener("cesvi:actions", onActions)
  }, [])
}
EOF_ACT

backup src/components/assistant/CaseProgress.tsx
cat > src/components/assistant/CaseProgress.tsx <<'EOF_PROG'
import { useEffect, useState } from "react"
import type { AssistantTopic } from "../../lib/assistantApi"

const STEPS = ["Ubicación", "Vehículos", "Dinámica", "Evidencia", "Informe"]

export default function CaseProgress({
  progress: progressProp,
  topics: topicsProp,
}: {
  progress?: number
  topics?: AssistantTopic[]
}) {
  const [state, setState] = useState<{ progress: number; topics: AssistantTopic[] }>({
    progress: 0,
    topics: [],
  })

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail
      setState({
        progress: Number(detail?.progress ?? 0),
        topics: Array.isArray(detail?.topics) ? detail.topics : [],
      })
    }
    window.addEventListener("cesvi:progress", onProgress)
    return () => window.removeEventListener("cesvi:progress", onProgress)
  }, [])

  const progress = progressProp ?? state.progress
  const topics = topicsProp ?? state.topics
  const isDone = (step: string) => topics.some((t) => t.name === step && t.done)
  const current = STEPS.findIndex((step) => !isDone(step))

  return (
    <div className="case-progress">
      <div className="progress-copy">
        <span>PROGRESO DEL EXPEDIENTE</span>
        <b>{progress}%</b>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="steps">
        {STEPS.map((step, index) => (
          <div
            className={isDone(step) ? "done" : index === current ? "current" : ""}
            key={step}
          >
            <span>{isDone(step) ? "✓" : index + 1}</span>
            <small>{step}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
EOF_PROG

# ------------------------------------------------------------------- 7. Fin
say "Listo. Falta solo 1 paso en el código del mapa."
cat <<'EOF_MSG'

Para correr:
  1) Servidor:  cd server && npm run dev        (http://localhost:3001)
  2) Front:     npm run dev                      (en otra terminal)

El chat ya responde y el progreso del expediente se mueve solo.
Para que el MAPA reaccione, donde estén los estados de vehículos / impacto /
ubicación (App.tsx), agrega:

  import { useAssistantActions } from "./hooks/useAssistantActions"
  ...
  useAssistantActions((actions) => applyActions(actions))

y pasa a <AssistantPanel context={...} /> un objeto con esta forma:
  { location, activeFrame, vehicles: [{ id, type, speed, braking, heading, position }], impact }

Acciones que puede mandar la IA: set_location, set_vehicle_type, set_speed,
set_braking, rotate_element, set_impact_point, move_vehicle, focus_scene_area.

Respaldos (*.bak) de lo que se reemplazó: hook del chat y CaseProgress.
Antes de hacer commit revisa con 'git status' que NO aparezcan .env ni .env.local.
EOF_MSG
