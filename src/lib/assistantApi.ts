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
