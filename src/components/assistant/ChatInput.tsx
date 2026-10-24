import { useRef } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  onAttachFile,
}: {
  value: string
  onChange: (val: string) => void
  onSend: () => void
  disabled?: boolean
  onAttachFile?: (fileName: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="chat-composer">
      <div className="composer-box">
        <textarea
          aria-label="Responder al asistente"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSend()
            }
          }}
          placeholder="Escribe un dato, observación o instrucción..."
          value={value}
        />
        <div className="composer-actions">
          <Button
            className="attach-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="plus" size={17} />
            Adjuntar evidencia
          </Button>
          <input
            accept="image/*,.pdf"
            className="evidence-file-input"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file && onAttachFile) onAttachFile(file.name)
              event.target.value = ""
            }}
            ref={fileInputRef}
            type="file"
          />
          <Button
            className="send-button"
            disabled={disabled}
            onClick={onSend}
            title="Enviar"
          >
            <Icon name="send" size={17} />
          </Button>
        </div>
      </div>
      <span className="privacy-note">
        La información se guarda en el expediente EXP-0248
      </span>
    </div>
  )
}
