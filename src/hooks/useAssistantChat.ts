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
