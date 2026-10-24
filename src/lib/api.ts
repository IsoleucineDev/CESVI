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

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000/api/v1"
).replace(/\/$/, "");
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
    const error: ApiError = new Error(`API request failed with status ${response.status}`);
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
): Promise<string>;
function sendAssistantMessage(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  includeMetadata: true,
): Promise<AssistantMessageResponse>;
async function sendAssistantMessage(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  includeMetadata = false,
): Promise<string | AssistantMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ case_id: CASE_ID, caseId: CASE_ID, message, context, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.body || !contentType.includes("text/event-stream")) {
    const payload = (await response.json()) as {
      answer?: string;
      message?: string;
      actions?: Action[];
      quickReplies?: string[];
      progress?: number;
      ready?: boolean;
      topics?: AssistantTopic[];
      missing?: string[];
    };
    const answer = payload.answer || payload.message || "";
    if (answer) onToken(answer);
    const result = {
      answer,
      actions: Array.isArray(payload.actions) ? payload.actions : [],
      quickReplies: Array.isArray(payload.quickReplies) ? payload.quickReplies : [],
      progress: typeof payload.progress === "number" ? payload.progress : 0,
      ready: payload.ready === true,
      topics: Array.isArray(payload.topics) ? payload.topics : [],
      missing: Array.isArray(payload.missing) ? payload.missing : [],
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
        content?: string;
        actions?: Action[];
        quickReplies?: string[];
        progress?: number;
        ready?: boolean;
        topics?: AssistantTopic[];
        missing?: string[];
      };
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
      if (Array.isArray(parsed.quickReplies)) quickReplies = parsed.quickReplies;
      if (typeof parsed.progress === "number") resultProgress = parsed.progress;
      if (typeof parsed.ready === "boolean") resultReady = parsed.ready;
      if (Array.isArray(parsed.topics)) resultTopics = parsed.topics;
      if (Array.isArray(parsed.missing)) resultMissing = parsed.missing;
      const token = parsed.token || parsed.content || parsed.answer || "";
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

  const result = {
    answer,
    actions,
    quickReplies,
    progress: resultProgress,
    ready: resultReady,
    topics: resultTopics,
    missing: resultMissing,
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
