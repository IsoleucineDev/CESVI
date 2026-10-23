export type Scene = {
  id?: string;
  name: string;
  order?: number;
};

export type CaseContext = {
  id: string;
  name?: string;
  location?: string;
  scenes?: Scene[];
  [key: string]: unknown;
};

type ApiError = Error & {
  status?: number;
  details?: unknown;
};

type ApiPayload<T> = T | { data?: T; message?: string; success?: boolean };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1/rat").replace(/\/$/, "");
const CASE_ID = import.meta.env.VITE_CASE_ID || "EXP-0248";
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const SCENES_API_BASE_URL = import.meta.env.VITE_SCENES_API_BASE_URL?.replace(/\/$/, "");
const AI_API_URL = (import.meta.env.VITE_AI_API_URL || `${API_BASE_URL}/ai/chat`).replace(/\/$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const unwrapData = <T>(payload: ApiPayload<T>): T => {
  if (isRecord(payload) && "data" in payload && payload.data !== undefined) {
    return payload.data as T;
  }
  return payload as T;
};

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (isRecord(payload) && typeof payload.message === "string") return payload.message;
  if (isRecord(payload) && isRecord(payload.errors)) {
    return Object.values(payload.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .join(" ");
  }
  return fallback;
};

const getHeaders = (init?: RequestInit, accepts = "application/json") => ({
  Accept: accepts,
  ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
  ...(init?.body ? { "Content-Type": "application/json" } : {}),
  ...init?.headers,
});

async function request<T>(
  path: string,
  init?: RequestInit,
  options: { accepts?: string; baseUrl?: string } = {},
): Promise<T> {
  const response = await fetch(`${options.baseUrl || API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: getHeaders(init, options.accepts),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json")
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const error: ApiError = new Error(
      getErrorMessage(payload, `La API respondió con el estado ${response.status}`),
    );
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  if (response.status === 204 || payload === "") return undefined as T;
  return unwrapData(payload as ApiPayload<T>);
}

const isNumericId = (value: string) => /^\d+$/.test(value);

const toCaseContext = (value: unknown): CaseContext => {
  if (!isRecord(value)) {
    throw new Error("La respuesta del expediente no tiene un formato válido");
  }

  const id = String(value.id ?? value.uuid ?? value.numero_siniestro ?? CASE_ID);
  return { ...value, id } as CaseContext;
};

const extractScenes = (value: CaseContext): Scene[] => {
  const candidates = [value.scenes, value.fases, value.etapas];
  const scenes = candidates.find(Array.isArray);
  if (!scenes) return [];

  return scenes
    .filter(isRecord)
    .map((scene, index) => ({
      id: scene.id === undefined ? undefined : String(scene.id),
      name: String(scene.name ?? scene.nombre ?? `Escena ${index + 1}`),
      order: typeof scene.order === "number" ? scene.order : index,
    }));
};

const getCase = async (): Promise<CaseContext> => {
  if (isNumericId(CASE_ID)) {
    return toCaseContext(await request<unknown>(`/siniestros/${encodeURIComponent(CASE_ID)}`));
  }

  const response = await request<unknown>(`/siniestros?buscar=${encodeURIComponent(CASE_ID)}`);
  const records = isRecord(response) && Array.isArray(response.data) ? response.data : response;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`No se encontró el expediente ${CASE_ID}`);
  }
  return toCaseContext(records[0]);
};

const getScenes = async (): Promise<Scene[]> => {
  const caseContext = await getCase();
  const embeddedScenes = extractScenes(caseContext);
  if (embeddedScenes.length > 0) return embeddedScenes;

  if (!SCENES_API_BASE_URL) return [];
  const payload = await request<Scene[] | { scenes?: Scene[] }>(
    `/cases/${encodeURIComponent(caseContext.id)}/scenes`,
    undefined,
    { baseUrl: SCENES_API_BASE_URL },
  );
  return Array.isArray(payload) ? payload : payload.scenes || [];
};

const getSceneBaseUrl = () => {
  if (!SCENES_API_BASE_URL) {
    throw new Error(
      "Las escenas no tienen un endpoint configurado. Define VITE_SCENES_API_BASE_URL en Vercel.",
    );
  }
  return SCENES_API_BASE_URL;
};

const readAssistantPayload = (payload: unknown) => {
  if (!isRecord(payload)) return "";
  return String(payload.token ?? payload.answer ?? payload.message ?? payload.content ?? "");
};

export const api = {
  caseId: CASE_ID,
  getCase,
  getScenes,

  createScene: (name: string, order: number) =>
    request<Scene>(
      `/cases/${encodeURIComponent(CASE_ID)}/scenes`,
      { method: "POST", body: JSON.stringify({ name, order }) },
      { baseUrl: getSceneBaseUrl() },
    ),

  updateScene: (sceneId: string, name: string) =>
    request<Scene>(
      `/scenes/${encodeURIComponent(sceneId)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
      { baseUrl: getSceneBaseUrl() },
    ),

  deleteScene: (sceneId: string) =>
    request<void>(
      `/scenes/${encodeURIComponent(sceneId)}`,
      { method: "DELETE" },
      { baseUrl: getSceneBaseUrl() },
    ),

  sendAssistantMessage: async (
    message: string,
    context: Record<string, unknown>,
    onToken: (token: string) => void,
  ) => {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(undefined, "text/event-stream, application/json"),
      body: JSON.stringify({ caseId: CASE_ID, message, context, stream: true }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const payload = contentType.includes("json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => "");
      throw new Error(getErrorMessage(payload, `El asistente respondió con el estado ${response.status}`));
    }

    if (!response.body || !contentType.includes("text/event-stream")) {
      const payload = contentType.includes("json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => "");
      const answer = typeof payload === "string" ? payload : readAssistantPayload(payload);
      if (answer) onToken(answer);
      return answer;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    const consumeEvent = (event: string) => {
      const data = event
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (!data || data === "[DONE]") return;

      try {
        const token = readAssistantPayload(JSON.parse(data));
        answer += token;
        if (token) onToken(token);
      } catch {
        answer += data;
        onToken(data);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      events.forEach(consumeEvent);
      if (done) break;
    }
    consumeEvent(buffer);
    return answer;
  },
};
