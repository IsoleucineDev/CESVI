import Button from "../ui/Button"
import Icon from "../ui/Icon"
import type { GeoVehicle } from "../../types/scenario"

type StepPosicionFinalProps = {
  vehicles: Record<string, GeoVehicle>
  isComplete: boolean
  onFinalize: () => void
  onExportReport: () => void
}

export default function StepPosicionFinal({
  vehicles,
  isComplete,
  onFinalize,
  onExportReport,
}: StepPosicionFinalProps) {
  const vehicleList = Object.keys(vehicles)

  return (
    <div className="wizard-step wizard-step-posicion-final" role="region" aria-label="Escena 04: Posición Final">
      <div className="wizard-chat-bubble assistant">
        <p className="wizard-message">
          🏁 <b>Último paso: Posición final de los vehículos.</b>
        </p>
        <p className="wizard-message-highlight">
          ¿Dónde quedaron los vehículos después del impacto?
        </p>
        <small>
          Arrastra cada vehículo en el mapa a su posición de reposo final y usa la manija superior para ajustar su rotación.
        </small>
      </div>

      <div className="wizard-substep">
        <div className="wizard-vehicle-summary-list">
          <small>Vehículos a posicionar:</small>
          <div className="wizard-chips-row compact">
            {vehicleList.map((id) => (
              <span className="wizard-data-chip" key={id}>
                🚗 {id}: {vehicles[id].type || "Vehículo"} ({vehicles[id].rotation}°)
              </span>
            ))}
          </div>
        </div>

        <div className="wizard-actions-footer" style={{ marginTop: 14 }}>
          {!isComplete ? (
            <button
              type="button"
              className="wizard-chip primary large pulse-finish"
              onClick={onFinalize}
            >
              🎉 Finalizar reconstrucción pericial (100%)
            </button>
          ) : (
            <div className="wizard-completed-box">
              <div className="success-banner">
                <Icon name="check" size={18} />
                <b>¡Expediente completado al 100%!</b>
              </div>
              <p>Todos los pasos periciales han sido registrados con éxito.</p>
              <Button className="share-button highlight" onClick={onExportReport}>
                <Icon name="download" />
                Descargar informe pericial
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
