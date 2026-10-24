import type { CSSProperties, DragEvent, PointerEvent, ReactNode } from "react"

export default function Button({
  ariaControls,
  ariaExpanded,
  children,
  className = "",
  disabled,
  draggable,
  onDragStart,
  onClick,
  onPointerDown,
  style,
  title,
}: {
  ariaControls?: string
  ariaExpanded?: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onClick?: () => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  style?: CSSProperties
  title?: string
}) {
  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      className={`button ${className}`}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}
