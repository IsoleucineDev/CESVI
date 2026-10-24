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
app.use(cors({ origin: true, credentials: true }));
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
