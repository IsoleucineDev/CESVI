import type {
  Action,
  ApiError,
  AssistantMessageResponse,
  AssistantTopic,
  CaseContext,
  Scene,
} from "../types/api";

export type {
  Action,
  ApiError,
  AssistantMessageResponse,
  AssistantTopic,
  CaseContext,
  Scene,
};

const RAW_API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_URL.endsWith("/api/v1")
  ? RAW_API_URL
  : `${RAW_API_URL}/api/v1`;

const CASE_ID = import.meta.env.VITE_CASE_ID || "EXP-0248";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const err = await response.json();
      if (err?.message) errorMessage = err.message;
    } catch {}
    const error: ApiError = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function sendAssistantMessage(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  history?: { role: string; content?: string; text?: string }[],
): Promise<string>;
function sendAssistantMessage(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  history?: { role: string; content?: string; text?: string }[],
  includeMetadata?: true,
): Promise<AssistantMessageResponse>;
async function sendAssistantMessage(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  history: { role: string; content?: string; text?: string }[] = [],
  includeMetadata = false,
): Promise<string | AssistantMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      case_id: CASE_ID,
      caseId: CASE_ID,
      message,
      context,
      history,
      stream: true,
    }),
  });

  if (!response.ok) {
    let errorMsg = `Error en el asistente (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson?.message) errorMsg = errorJson.message;
    } catch {}
    const err: ApiError = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.body || !contentType.includes("text/event-stream")) {
    const payload = (await response.json()) as {
      answer?: string;
      message?: string;
      text?: string;
      actions?: Action[];
      quickReplies?: string[];
      quick_replies?: string[];
      progress?: number;
      ready?: boolean;
      topics?: AssistantTopic[];
      missing?: string[];
      fields?: Record<string, any>;
    };
    const answer = payload.answer || payload.text || payload.message || "";
    if (answer) onToken(answer);
    const quickReplies = payload.quickReplies || payload.quick_replies || [];
    const result: AssistantMessageResponse = {
      answer,
      actions: Array.isArray(payload.actions) ? payload.actions : [],
      quickReplies,
      quick_replies: quickReplies,
      progress: typeof payload.progress === "number" ? payload.progress : 0,
      ready: payload.ready === true,
      topics: Array.isArray(payload.topics) ? payload.topics : [],
      missing: Array.isArray(payload.missing) ? payload.missing : [],
      fields: payload.fields,
    };
    return includeMetadata ? result : result.answer;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let actions: Action[] = [];
  let quickReplies: string[] = [];
  let resultProgress = 0;
  let resultReady = false;
  let resultTopics: AssistantTopic[] = [];
  let resultMissing: string[] = [];
  let fields: Record<string, any> | undefined = undefined;

  const consumeEvent = (event: string) => {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data) as {
        token?: string;
        answer?: string;
        text?: string;
        content?: string;
        actions?: Action[];
        quickReplies?: string[];
        quick_replies?: string[];
        progress?: number;
        ready?: boolean;
        topics?: AssistantTopic[];
        missing?: string[];
        fields?: Record<string, any>;
      };
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
      if (Array.isArray(parsed.quickReplies)) quickReplies = parsed.quickReplies;
      if (Array.isArray(parsed.quick_replies)) quickReplies = parsed.quick_replies;
      if (typeof parsed.progress === "number") resultProgress = parsed.progress;
      if (typeof parsed.ready === "boolean") resultReady = parsed.ready;
      if (Array.isArray(parsed.topics)) resultTopics = parsed.topics;
      if (Array.isArray(parsed.missing)) resultMissing = parsed.missing;
      if (parsed.fields) fields = parsed.fields;
      const token = parsed.token || "";
      if (token) {
        answer += token;
        onToken(token);
      }
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

  const result: AssistantMessageResponse = {
    answer,
    actions,
    quickReplies,
    quick_replies: quickReplies,
    progress: resultProgress,
    ready: resultReady,
    topics: resultTopics,
    missing: resultMissing,
    fields,
  };
  return includeMetadata ? result : result.answer;
}

export const api = {
  caseId: CASE_ID,

  getCase: () => request<CaseContext>(`/cases/${encodeURIComponent(CASE_ID)}`),

  getScenes: async () => {
    const payload = await request<Scene[] | { scenes: Scene[] }>(
      `/cases/${encodeURIComponent(CASE_ID)}/scenes`,
    );
    return Array.isArray(payload) ? payload : payload.scenes;
  },

  createScene: (name: string, order: number) =>
    request<Scene>(`/cases/${encodeURIComponent(CASE_ID)}/scenes`, {
      method: "POST",
      body: JSON.stringify({ name, order }),
    }),

  updateScene: (sceneId: string, name: string) =>
    request<Scene>(`/scenes/${encodeURIComponent(sceneId)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  deleteScene: (sceneId: string) =>
    request<void>(`/scenes/${encodeURIComponent(sceneId)}`, { method: "DELETE" }),

  sendAssistantMessage,
};
