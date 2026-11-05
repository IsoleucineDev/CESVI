import Button from "../ui/Button"
import Icon from "../ui/Icon"

export default function Dashboard({
  onClose,
  onNewCase,
}: {
  onClose: () => void
  onNewCase: () => void
}) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">CENTRO DE CASOS</div>
          <div className="dashboard-title">Expedientes recientes</div>
        </div>
        <Button className="icon-button" onClick={onClose} title="Cerrar">
          <Icon name="close" />
        </Button>
      </div>
      <div className="dashboard-metrics">
        <div className="metric">
          <span>Casos activos</span>
          <strong>12</strong>
          <small>3 requieren revisión</small>
        </div>
        <div className="metric">
          <span>Reconstrucciones</span>
          <strong>28</strong>
          <small>Durante este mes</small>
        </div>
        <div className="metric">
          <span>Tiempo promedio</span>
          <strong>4.2 h</strong>
          <small>−18% vs. mes anterior</small>
        </div>
      </div>
      <div className="case-list">
        {[
          [
            "EXP-0248",
            "Colisión en Av. Reforma",
            "Editado hace 12 min",
            "En curso",
          ],
          ["EXP-0245", "Alcance en Insurgentes Sur", "Ayer, 18:42", "Revisión"],
          [
            "EXP-0239",
            "Cruce de Calz. de Tlalpan",
            "12 jun, 10:16",
            "Completado",
          ],
        ].map(([id, name, date, status]) => (
          <Button className="case-row" key={id} onClick={onClose}>
            <span className="case-icon">
              <Icon name="map" />
            </span>
            <span className="case-main">
              <b>{name}</b>
              <small>
                {id} · {date}
              </small>
            </span>
            <span
              className={`status status-${status.toLowerCase().replace("ó", "o")}`}
            >
              {status}
            </span>
            <Icon name="arrow" />
          </Button>
        ))}
      </div>
      <Button className="primary-button" onClick={onNewCase}>
        <Icon name="plus" />
        Nuevo expediente
      </Button>
    </div>
  )
}
