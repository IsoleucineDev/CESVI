import Button from "./Button"
import Icon from "./Icon"
import type { IconName } from "./iconPaths"

export default function ToolButton({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: IconName
  label: string
  onClick?: () => void
}) {
  return (
    <Button
      className={`tool-button ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="tool-icon">
        <Icon name={icon} size={21} />
      </span>
      <span>{label}</span>
    </Button>
  )
}
