import Icon from "../ui/Icon"
import type { ChatItem } from "../../hooks/useAssistantChat"

export default function ChatMessage({ message }: { message: ChatItem }) {
  if (message.role === "assistant") {
    return (
      <div className="assistant-message">
        <div className="message-avatar">
          <Icon name="sparkle" size={15} />
        </div>
        <div className="message-bubble">
          {message.text.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {message.time && <span>{message.time}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="user-message">
      <div className="message-bubble">
        <p>{message.text}</p>
        {message.time && <span>{message.time}</span>}
      </div>
    </div>
  )
}
