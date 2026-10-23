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
      location: "Av. Paseo de la Reforma 222",
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

/* ---------- Asistente de IA ---------- */
const SYSTEM = `Eres el "Asistente pericial" de CESVI. Ayudas a un perito a reconstruir un siniestro vial paso a paso.
Pasos del expediente: Ubicación, Vehículos, Dinámica, Evidencia, Informe.
Recibes el estado actual de la escena en JSON y el mensaje del perito.
Reglas:
- Haz UNA sola pregunta a la vez, corta, en español.
- Nunca inventes datos. Si el perito no sabe algo, acepta "No se pudo determinar" y avanza.
- Si el perito da un dato que cambia la escena, devuélvelo en "actions".
- Responde SOLO con un JSON válido con esta forma:
{"answer":"texto para el chat","actions":[],"quickReplies":["opción 1","opción 2"]}
Acciones permitidas (campo "type"):
{"type":"set_speed","vehicleId":"...","value":42}  (km/h)
{"type":"set_braking","vehicleId":"...","value":8.4}  (metros)
{"type":"rotate_element","vehicleId":"...","heading":"Noreste"}
{"type":"move_vehicle","vehicleId":"...","lat":0,"lng":0}
{"type":"focus_scene_area","lat":0,"lng":0,"zoom":18}
Usa solo ids de vehículo que existan en el estado recibido. "quickReplies" es opcional, máximo 4.`;

const history = new Map(); // caseId -> [{role, content}]

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

app.post("/api/ai/chat", async (req, res) => {
  const { caseId = "EXP-0248", message, context = {} } = req.body ?? {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message requerido" });
  }

  const past = history.get(caseId) ?? [];
  const current = {
    role: "user",
    content: `ESTADO ACTUAL DE LA ESCENA (JSON):\n${JSON.stringify(context)}\n\nMENSAJE DEL PERITO:\n${message}`,
  };
  const messages = [...past.slice(-10), current];

  let lastRaw = "";
  for (const [name, call] of providers) {
    try {
      const raw = await call(messages);
      lastRaw = raw || lastRaw;
      const parsed = parseReply(raw);
      if (!parsed || !parsed.answer) throw new Error("JSON inválido o sin 'answer'");
      history.set(caseId, [
        ...past.slice(-10),
        { role: "user", content: String(message) },
        { role: "assistant", content: parsed.answer },
      ]);
      return res.json(parsed);
    } catch (err) {
      console.warn(`[${name}] falló: ${err.message}`);
    }
  }

  if (lastRaw) return res.json({ answer: lastRaw, actions: [], quickReplies: [] });
  res.status(502).json({ error: "Ningún proveedor de IA respondió" });
});

app.listen(PORT, () => console.log(`Servidor CESVI en http://localhost:${PORT}`));
