import Button from "../ui/Button"
import Icon from "../ui/Icon"
import { MAX_FRAMES } from "../../types/scenario"

type SceneTabsProps = {
  frames: string[]
  selectedFrame: number
  onSelectFrame: (index: number) => void
  onAddFrame: () => void
}

export default function SceneTabs({
  frames,
  selectedFrame,
  onSelectFrame,
  onAddFrame,
}: SceneTabsProps) {
  return (
    <div className="scene-tabs">
      <div className="scene-tab-list">
        {frames.map((frame, index) => (
          <Button
            className={`scene-tab ${
              selectedFrame === index ? "is-active" : ""
            }`}
            key={`${frame}-${index}`}
            onClick={() => onSelectFrame(index)}
          >
            <span className="frame-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            {frame}
          </Button>
        ))}
        <Button
          className="add-scene"
          disabled={frames.length >= MAX_FRAMES}
          onClick={onAddFrame}
          title={
            frames.length >= MAX_FRAMES
              ? "Límite de 30 escenas alcanzado"
              : "Agregar estado"
          }
        >
          <Icon name="plus" />
        </Button>
      </div>
      <div className="scene-state">
        <span className="live-dot" />
        Editando: {frames[selectedFrame]}
      </div>
    </div>
  )
}
