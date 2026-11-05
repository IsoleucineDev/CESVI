import { useState } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"
import type { VehicleDraft, Scene02Substep } from "../../hooks/useWizard"
import type { GeoVehicle, RelativeVehicle } from "../../types/scenario"

const VEHICLE_TYPES = [
  { id: "Automóvil", label: "Automóvil", icon: "car" },
  { id: "Camioneta", label: "Camioneta", icon: "car" },
  { id: "Moto", label: "Moto", icon: "motorcycle" },
  { id: "Camión", label: "Camión", icon: "truck" },
  { id: "Bicicleta", label: "Bicicleta", icon: "plus" },
]

const DIRECTIONS: Array<{ code: string; label: string; deg: number }> = [
  { code: "N", label: "Norte (N)", deg: 0 },
  { code: "NE", label: "Noreste (NE)", deg: 45 },
  { code: "E", label: "Este (E)", deg: 90 },
  { code: "SE", label: "Sureste (SE)", deg: 135 },
  { code: "S", label: "Sur (S)", deg: 180 },
  { code: "SO", label: "Suroeste (SO)", deg: 225 },
  { code: "O", label: "Oeste (O)", deg: 270 },
  { code: "NO", label: "Noroeste (NO)", deg: 315 },
]

type StepAproximacionProps = {
  currentVehicleId: string
  substep: Scene02Substep
  draft: Partial<VehicleDraft>
  vehicles: Record<string, GeoVehicle>
  onSetSubstep: (substep: Scene02Substep) => void
  onUpdateDraft: (updates: Partial<VehicleDraft>) => void
  onSaveVehicle: () => void
  onAddNextVehicle: () => void
  onFinishVehicles: () => void
  onStartTrajectoryMode: () => void
  onSkipTrajectory: () => void
  onDeleteVehicle?: (id: string) => void
  isPlacingOnMap: boolean
  isDrawingTrajectory: boolean
}

export default function StepAproximacion({
  currentVehicleId,
  substep,
  draft,
  vehicles,
  onSetSubstep,
  onUpdateDraft,
  onSaveVehicle,
  onAddNextVehicle,
  onFinishVehicles,
  onStartTrajectoryMode,
  onSkipTrajectory,
  onDeleteVehicle,
  isPlacingOnMap,
  isDrawingTrajectory,
}: StepAproximacionProps) {
  const [modelInput, setModelInput] = useState(draft.model ?? "")
  const [speedVal, setSpeedVal] = useState<number>(draft.speed ?? 45)
  const existingVehiclesList = Object.keys(vehicles)

  return (
    <div className="wizard-step wizard-step-aproximacion" role="region" aria-label="Escena 02: Vehículos">
      <div className="wizard-chat-bubble assistant">
        <p className="wizard-message">
          Ahora los vehículos. Configurando <b>{currentVehicleId}</b>.
        </p>
        {existingVehiclesList.length > 0 && (
          <div className="wizard-vehicle-summary-list">
            <small>Vehículos registrados en el siniestro:</small>
            <div className="wizard-chips-row compact">
              {existingVehiclesList.map((id) => (
                <span className="wizard-data-chip" key={id}>
                  🚘 {id}: {vehicles[id].type || "Vehículo"} ({vehicles[id].speed ?? 0} km/h)
                  {existingVehiclesList.length > 1 && onDeleteVehicle && (
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => onDeleteVehicle(id)}
                      title={`Eliminar ${id}`}
                      aria-label={`Eliminar ${id}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1. Tipo */}
      {substep === "type" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">1. ¿Qué tipo de vehículo es {currentVehicleId}?</p>
          <div className="wizard-chips-row">
            {VEHICLE_TYPES.map((t) => (
              <button
                type="button"
                className={`wizard-chip ${draft.type === t.id ? "primary active" : ""}`}
                key={t.id}
                onClick={() => {
                  onUpdateDraft({ type: t.id })
                  onSetSubstep("model")
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Marca / modelo / año */}
      {substep === "model" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">
            2. Marca, modelo y año de {currentVehicleId} (opcional):
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onUpdateDraft({ model: modelInput.trim() || undefined })
              onSetSubstep("direction")
            }}
            className="wizard-inline-search"
          >
            <input
              type="text"
              className="wizard-input"
              placeholder="Ej. Nissan Versa 2021"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              aria-label="Marca, modelo y año"
            />
            <Button type="submit" className="wizard-submit-btn">
              Continuar
            </Button>
          </form>
          <div className="wizard-chips-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={() => {
                onUpdateDraft({ model: undefined })
                onSetSubstep("direction")
              }}
            >
              Omitir
            </button>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("type")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 3. Dirección de circulación */}
      {substep === "direction" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">
            3. ¿Hacia dónde circulaba {currentVehicleId}?
          </p>
          <div className="wizard-chips-grid">
            {DIRECTIONS.map((dir) => (
              <button
                type="button"
                className={`wizard-chip ${draft.direction === dir.code ? "primary active" : ""}`}
                key={dir.code}
                onClick={() => {
                  onUpdateDraft({ direction: dir.code })
                  onSetSubstep("speed")
                }}
              >
                <b>{dir.code}</b> <small>({dir.deg}°)</small>
              </button>
            ))}
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("model")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 4. Velocidad estimada */}
      {substep === "speed" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">
            4. Velocidad estimada de {currentVehicleId}: <b>{speedVal} km/h</b>
          </p>
          <div className="wizard-slider-control">
            <input
              type="range"
              min={0}
              max={160}
              step={5}
              value={speedVal}
              onChange={(e) => setSpeedVal(Number(e.target.value))}
              aria-label="Velocidad en km/h"
              className="wizard-range"
            />
            <div className="slider-labels">
              <span>0 km/h</span>
              <span className="current-val">{speedVal} km/h</span>
              <span>160 km/h</span>
            </div>
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="wizard-chip primary"
              onClick={() => {
                onUpdateDraft({ speed: speedVal })
                onSetSubstep("place")
              }}
            >
              Continuar a colocar en mapa
            </button>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("direction")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 5. Colocación en el mapa */}
      {substep === "place" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>
              📍 <b>Toca el mapa donde estaba {currentVehicleId}.</b>
            </p>
            <small>
              Observa el marcador fantasma sobre el mapa y haz clic en el punto de inicio de la aproximación.
            </small>
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("speed")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 6. Trayectoria */}
      {substep === "trajectory" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant">
            <p>
              🛣️ <b>Dibuja de dónde venía {currentVehicleId}.</b>
            </p>
            <small>
              Haz clic en el mapa para marcar puntos de su trayectoria previa al choque. Doble clic para terminar.
            </small>
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="wizard-chip primary"
              onClick={onStartTrajectoryMode}
            >
              {isDrawingTrajectory ? "✓ Terminar trazado" : "✏️ Dibujar trayectoria"}
            </button>
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={onSkipTrajectory}
            >
              Omitir trayectoria
            </button>
          </div>
        </div>
      )}

      {/* 7. ¿Hubo otro vehículo? */}
      {substep === "ask_another" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant confirmation">
            <p>¿Hubo otro vehículo involucrado en el siniestro?</p>
          </div>
          <div className="wizard-chips-row">
            {existingVehiclesList.length < 6 && (
              <button
                type="button"
                className="wizard-chip primary"
                onClick={onAddNextVehicle}
              >
                + Sí, agregar V{existingVehiclesList.length + 1}
              </button>
            )}
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={onFinishVehicles}
            >
              ✓ No, continuar a Impacto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
