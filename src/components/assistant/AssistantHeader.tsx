import { useState } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"

export default function AssistantHeader({
  onClearChat,
  onShowProperties,
}: {
  onClearChat: () => void
  onShowProperties: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="assistant-header">
      <div className="assistant-identity">
        <span className="assistant-logo">
          <Icon name="sparkle" size={18} />
        </span>
        <div>
          <b>Asistente pericial</b>
          <span>Reconstrucción guiada</span>
        </div>
      </div>
      <Button
        ariaExpanded={open}
        className="icon-button"
        onClick={() => setOpen((curr) => !curr)}
        title="Opciones del asistente"
      >
        <Icon name="more" />
      </Button>
      {open && (
        <div className="assistant-options">
          <Button
            onClick={() => {
              onClearChat()
              setOpen(false)
            }}
          >
            Limpiar conversación
          </Button>
          <Button
            onClick={() => {
              onShowProperties()
              setOpen(false)
            }}
          >
            Mostrar propiedades
          </Button>
        </div>
      )}
    </div>
  )
}
