import { useEffect, useRef, useState } from "react"

import { api, type Action, type AssistantTopic } from "../lib/api"

type ChatMessage = {
  role: "user" | "assistant"

  text: string

  quickReplies?: string[]
}

type AssistantProgress = {
  progress: number

  ready: boolean

  topics: AssistantTopic[]

  missing: string[]
}

export type AssistantContext = {
  location: string

  activeFrame: string

  vehicles: {
    id: string

    type: string | null

    speed: number | null

    braking: number | null

    heading: string | null

    position: { lat: number lng: number }
  }[]

  impact: { lat: number lng: number } | null
}

type AssistantPanelProps = {
  context: AssistantContext

  onActions: (actions: Action[]) => void

  onProgress: (info: AssistantProgress) => void
}

function ActionButton({
  children,

  className = "",

  disabled,

  onClick,

  title,
}: {
  children: React.ReactNode

  className?: string

  disabled?: boolean

  onClick?: () => void

  title?: string
}) {
  return (
    <button
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

function SparkleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  )
}

export default function AssistantPanel({
  context,

  onActions,

  onProgress,
}: AssistantPanelProps) {
  const [chatText, setChatText] = useState("")

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",

      text: "Hola, soy tu asistente pericial. ¿En qué ubicación ocurrió el siniestro?",
    },
  ])

  const [loading, setLoading] = useState(false)

  const [ready, setReady] = useState(false)

  const contextRef = useRef(context)

  const onActionsRef = useRef(onActions)

  const onProgressRef = useRef(onProgress)

  const loadingRef = useRef(false)

  const conversationEndRef = useRef<HTMLDivElement>(null)

  contextRef.current = context

  onActionsRef.current = onActions

  onProgressRef.current = onProgress

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async (text = chatText.trim()) => {
    if (!text || loadingRef.current) return

    loadingRef.current = true

    setChatText("")

    setMessages((current) => [
      ...current,

      { role: "user", text },

      { role: "assistant", text: "" },
    ])

    setLoading(true)

    try {
      const response = await api.sendAssistantMessage(
        text,

        contextRef.current,

        (token) => {
          setMessages((current) => {
            const next = [...current]

            const lastMessage = next[next.length - 1]

            if (lastMessage?.role === "assistant") {
              next[next.length - 1] = {
                ...lastMessage,
                text: `${lastMessage.text}${token}`,
              }
            }

            return next
          })
        },

        true,
      )

      onActionsRef.current(response.actions)

      const progressInfo = {
        progress: response.progress,

        ready: response.ready,

        topics: response.topics,

        missing: response.missing,
      }

      onProgressRef.current(progressInfo)

      setReady(response.ready)

      setMessages((current) => {
        const next = [...current]

        const lastMessage = next[next.length - 1]

        if (lastMessage?.role === "assistant") {
          next[next.length - 1] = {
            ...lastMessage,

            text: response.answer,

            quickReplies: response.quickReplies,
          }
        }

        return next
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo contactar al asistente."

      setMessages((current) => {
        const next = [...current]

        const lastMessage = next[next.length - 1]

        if (lastMessage?.role === "assistant") {
          next[next.length - 1] = { ...lastMessage, text: `Error: ${message}` }
        }

        return next
      })
    } finally {
      loadingRef.current = false

      setLoading(false)
    }
  }

  return (
    <>
      <div className="assistant-header">
        <div className="assistant-identity">
          <span className="assistant-logo">
            <SparkleIcon />
          </span>
          <div>
            <b>Asistente pericial</b>
            <span>Reconstrucción guiada</span>
          </div>
        </div>
        <ActionButton className="icon-button">
          <svg
            aria-hidden="true"
            className="icon"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        </ActionButton>
      </div>

      <div className="conversation">
        <div className="date-divider">
          <span />
          <b>DINÁMICA DEL SINIESTRO</b>
          <span />
        </div>
        <div className="context-card">
          <div className="context-head">
            <span>
              <svg
                aria-hidden="true"
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path d="m5 17-1 2v1h2l1-2h10l1 2h2v-1l-1-2M3 13h18v4H3zM5 13l2-6h10l2 6" />
              </svg>
            </span>
            <div>
              <b>Vehículo 01</b>
              <small>
                {context.vehicles[0]?.type ?? "Tipo sin indicar"} · Elemento
                seleccionado en el mapa
              </small>
            </div>
          </div>
          <div className="context-stats">
            <div>
              <span>Velocidad</span>
              <b>
                {context.vehicles[0]?.speed === null ||
                context.vehicles[0]?.speed === undefined
                  ? "—"
                  : `${context.vehicles[0].speed} km/h`}
              </b>
            </div>
            <div>
              <span>Trayectoria</span>
              <b>{context.vehicles[0]?.heading ?? "Sin indicar"}</b>
            </div>
          </div>
        </div>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`}>
            <div
              className={
                message.role === "assistant"
                  ? "assistant-message"
                  : "user-message"
              }
            >
              {message.role === "assistant" && (
                <div className="message-avatar">
                  <SparkleIcon size={15} />
                </div>
              )}
              <div className="message-bubble">
                <p>
                  {message.text ||
                    (loading && index === messages.length - 1
                      ? "Escribiendo…"
                      : "")}
                </p>
                <span>Ahora</span>
              </div>
            </div>
            {index === messages.length - 1 &&
              message.role === "assistant" &&
              Boolean(message.quickReplies?.length) && (
                <div className="quick-options">
                  {message.quickReplies?.map((reply) => (
                    <ActionButton
                      key={reply}
                      onClick={() => void sendMessage(reply)}
                    >
                      {reply}
                    </ActionButton>
                  ))}
                </div>
              )}
          </div>
        ))}
        {ready && (
          <ActionButton
            className="primary-button"
            onClick={() => {
              setMessages((current) => [
                ...current,

                {
                  role: "assistant",
                  text: "Confirmado. La simulación puede generarse.",
                },
              ])

              setReady(false)
            }}
          >
            Generar simulación
          </ActionButton>
        )}
        <div ref={conversationEndRef} />
      </div>

      <div className="chat-composer">
        <div className="composer-box">
          <textarea
            aria-label="Responder al asistente"
            onChange={(event) => setChatText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()

                void sendMessage()
              }
            }}
            placeholder="Escribe un dato, observación o instrucción..."
            value={chatText}
          />
          <div className="composer-actions">
            <ActionButton className="attach-button">
              <svg
                aria-hidden="true"
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Adjuntar evidencia
            </ActionButton>
            <ActionButton
              className="send-button"
              disabled={loading || !chatText.trim()}
              onClick={() => void sendMessage()}
              title="Enviar"
            >
              <svg
                aria-hidden="true"
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" />
              </svg>
            </ActionButton>
          </div>
        </div>
        <span className="privacy-note">
          La información se guarda en el expediente EXP-0248
        </span>
      </div>
    </>
  )
}
