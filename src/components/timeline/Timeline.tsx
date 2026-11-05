import Button from "../ui/Button"
import Icon from "../ui/Icon"

type TimelineProps = {
  framesCount: number
  selectedFrame: number
  playing: boolean
  onTogglePlay: () => void
  onPrevFrame: () => void
  onNextFrame: () => void
}

export default function Timeline({
  framesCount,
  selectedFrame,
  playing,
  onTogglePlay,
  onPrevFrame,
  onNextFrame,
}: TimelineProps) {
  return (
    <div className="timeline">
      <span className="timeline-start">00:00</span>
      <div className="timeline-controls">
        <Button
          className="timeline-control timeline-previous"
          disabled={selectedFrame === 0}
          onClick={onPrevFrame}
          title="Escena anterior"
        >
          <Icon name="arrow" size={15} />
        </Button>
        <Button
          className="timeline-control timeline-play"
          onClick={onTogglePlay}
          title={playing ? "Pausar" : "Reproducir"}
        >
          <Icon name={playing ? "pause" : "play"} size={16} />
        </Button>
        <Button
          className="timeline-control"
          disabled={selectedFrame === framesCount - 1}
          onClick={onNextFrame}
          title="Escena siguiente"
        >
          <Icon name="arrow" size={15} />
        </Button>
      </div>
      <div className="timeline-impact">
        <span>Impacto · 00:03.38</span>
        <i aria-hidden="true" />
      </div>
      <div className="timeline-rail">
        <div
          className="timeline-progress"
          aria-hidden="true"
          style={{
            width: `${
              framesCount > 1
                ? (selectedFrame / (framesCount - 1)) * 100
                : 0
            }%`,
          }}
        >
          <span />
          <span className="timeline-playhead" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
