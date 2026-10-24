import Button from "../ui/Button"

export default function QuickReplies({
  options,
  onSelect,
  disabled,
}: {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
}) {
  if (!options || options.length === 0) return null

  return (
    <div className="quick-options">
      {options.map((option) => (
        <Button
          disabled={disabled}
          key={option}
          onClick={() => onSelect(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  )
}
