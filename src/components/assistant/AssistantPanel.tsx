import AssistantHeader from "./AssistantHeader"
import CaseProgress from "./CaseProgress"
import ChatMessageList from "./ChatMessageList"
import QuickReplies from "./QuickReplies"
import SelectedElementCard from "./SelectedElementCard"
import ChatInput from "./ChatInput"
import { useAssistantChat } from "../../hooks/useAssistantChat"
import type { useWizard } from "../../hooks/useWizard"
import { indexToStep, stepToIndex } from "../../lib/wizardMachine"
import type { ReactNode } from "react"

export default function AssistantPanel({
  context,
  onShowProperties,
  onAttachFile,
  wizard,
  wizardContent,
}: {
  context?: Record<string, unknown>
  onShowProperties?: () => void
  onAttachFile?: (filename: string) => void
  wizard?: ReturnType<typeof useWizard>
  wizardContent?: ReactNode
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
        onClearChat={wizard ? wizard.restartWizard : clearChat}
        onShowProperties={onShowProperties || (() => {})}
      />
      <CaseProgress
        progress={wizard?.progress}
        activeStepIndex={wizard?.activeSceneIndex}
        unlockedIndices={
          wizard ? wizard.wizardState.unlockedSteps.map(stepToIndex) : [0]
        }
        onSelectStepIndex={
          wizard ? (idx) => wizard.goToStep(indexToStep(idx)) : undefined
        }
      />
      {wizardContent ? (
        <div className="conversation wizard-conversation">
          {wizardContent}
        </div>
      ) : (
        <>
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
        </>
      )}
    </aside>
  )
}
