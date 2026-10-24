import Icon from "../ui/Icon"
import type { SelectedElementFields } from "../../hooks/useAssistantChat"

export default function SelectedElementCard({
  stats,
}: {
  stats: SelectedElementFields
}) {
  return (
    <div className="context-card">
      <div className="context-head">
        <span>
          <Icon name="car" size={17} />
        </span>
        <div>
          <b>{stats.vehicle}</b>
          <small>Elemento seleccionado en el mapa</small>
        </div>
      </div>
      <div className="context-stats">
        <div>
          <span>Velocidad</span>
          <b>{stats.speed}</b>
        </div>
        <div>
          <span>Trayectoria</span>
          <b>{stats.trajectory}</b>
        </div>
        <div>
          <span>Confianza</span>
          <b className="confidence">{stats.confidence}</b>
        </div>
      </div>
    </div>
  )
}
