import type { ReactNode } from "react"
import ChatMessage from "./ChatMessage"
import type { ChatItem } from "../../hooks/useAssistantChat"

export default function ChatMessageList({
  messages,
  children,
}: {
  messages: ChatItem[]
  children?: ReactNode
}) {
  return (
    <div className="conversation">
      <div className="date-divider">
        <span />
        <b>DINÁMICA DEL SINIESTRO</b>
        <span />
      </div>
      {messages.map((message, index) => (
        <ChatMessage key={`${message.role}-${index}`} message={message} />
      ))}
      {children}
    </div>
  )
}
