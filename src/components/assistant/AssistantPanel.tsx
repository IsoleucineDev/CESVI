import AssistantHeader from "./AssistantHeader"
import CaseProgress from "./CaseProgress"
import ChatMessageList from "./ChatMessageList"
import QuickReplies from "./QuickReplies"
import SelectedElementCard from "./SelectedElementCard"
import ChatInput from "./ChatInput"
import { useAssistantChat } from "../../hooks/useAssistantChat"

export default function AssistantPanel({
  context,
  onShowProperties,
  onAttachFile,
}: {
  context?: Record<string, unknown>
  onShowProperties?: () => void
  onAttachFile?: (filename: string) => void
}) {
  const {
    messages,
    isTyping,
    chatText,
    setChatText,
    quickReplies,
    selectedElement,
    sendMessage,
    clearChat,
  } = useAssistantChat(context)

  return (
    <aside className="assistant-pane">
      <AssistantHeader
        onClearChat={clearChat}
        onShowProperties={onShowProperties || (() => {})}
      />
      <CaseProgress />
      <ChatMessageList messages={messages}>
        <QuickReplies
          disabled={isTyping}
          onSelect={(option) => sendMessage(option)}
          options={quickReplies}
        />
        <SelectedElementCard stats={selectedElement} />
      </ChatMessageList>
      <ChatInput
        disabled={isTyping}
        onAttachFile={onAttachFile}
        onChange={setChatText}
        onSend={() => sendMessage()}
        value={chatText}
      />
    </aside>
  )
}
