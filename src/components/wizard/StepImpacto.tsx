import { useState } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"
import type { Scene03Substep } from "../../hooks/useWizard"
import type { GeoPosition, GeoVehicle } from "../../types/scenario"

const IMPACT_ZONE_OPTIONS = [
  { id: "front", label: "Frente" },
  { id: "side-left", label: "Lateral izquierdo" },
  { id: "side-right", label: "Lateral derecho" },
  { id: "rear", label: "Trasera" },
]

type StepImpactoProps = {
  substep: Scene03Substep
  vehicles: Record<string, GeoVehicle>
  impactVehicles: string[]
  impactPosition: GeoPosition
  impactTime: string
  impactZones: Record<string, string>
  onSetSubstep: (substep: Scene03Substep) => void
  onToggleImpactVehicle: (vehicleId: string) => void
  onSetImpactZone: (vehicleId: string, zone: string) => void
  onSetImpactTime: (time: string) => void
  onFinishImpact: () => void
  onAddEvidence: () => void
  onAddSignal: () => void
  onStartMeasure: () => void
  isPlacingImpact: boolean
}

export default function StepImpacto({
  substep,
  vehicles,
  impactVehicles,
  impactPosition,
  impactTime,
  impactZones,
  onSetSubstep,
  onToggleImpactVehicle,
  onSetImpactZone,
  onSetImpactTime,
  onFinishImpact,
  onAddEvidence,
  onAddSignal,
  onStartMeasure,
  isPlacingImpact,
}: StepImpactoProps) {
  const vehicleIds = Object.keys(vehicles)
  const [editingTime, setEditingTime] = useState(impactTime)
  const [activeZoneVehicleIdx, setActiveZoneVehicleIdx] = useState(0)

  const currentZoneVehicleId = impactVehicles[activeZoneVehicleIdx] ?? impactVehicles[0]

  return (
    <div className="wizard-step wizard-step-impacto" role="region" aria-label="Escena 03: Impacto">
      <div className="wizard-chat-bubble assistant">
        <p className="wizard-message">
          Escena 03: <b>Punto de impacto y dinámica del choque.</b>
        </p>
      </div>

      {/* 1. Colocar punto de impacto */}
      {substep === "place_impact" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>💥 <b>¿Dónde ocurrió el choque? Toca el mapa para marcar el punto de impacto.</b></p>
            <small>Aparecerá un punto rojo con animación de pulso que podrás arrastrar para reubicarlo.</small>
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="wizard-chip primary"
              onClick={() => onSetSubstep("select_vehicles")}
            >
              ✓ Punto fijado ({impactPosition.lat.toFixed(5)}, {impactPosition.lng.toFixed(5)}) · Continuar
            </button>
          </div>
        </div>
      )}

      {/* 2. Seleccionar vehículos participantes */}
      {substep === "select_vehicles" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">¿Qué vehículos participaron en la colisión?</p>
          <div className="wizard-chips-row">
            {vehicleIds.map((id) => {
              const selected = impactVehicles.includes(id)
              return (
                <button
                  type="button"
                  key={id}
                  className={`wizard-chip ${selected ? "primary active" : ""}`}
                  onClick={() => onToggleImpactVehicle(id)}
                >
                  {selected ? "✓ " : ""}{id}: {vehicles[id].type || "Vehículo"}
                </button>
              )
            })}
          </div>

          <div className="wizard-time-editor">
            <label>
              <span>Tiempo de impacto en el timeline:</span>
              <input
                type="text"
                className="wizard-input time-input"
                value={editingTime}
                onChange={(e) => {
                  setEditingTime(e.target.value)
                  onSetImpactTime(e.target.value)
                }}
                placeholder="00:03.38"
              />
            </label>
          </div>

          <div className="wizard-chips-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="wizard-chip primary"
              disabled={impactVehicles.length === 0}
              onClick={() => onSetSubstep("impact_zones")}
            >
              Confirmar vehículos e ir a zonas de impacto
            </button>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("place_impact")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 3. Zonas de impacto */}
      {substep === "impact_zones" && currentZoneVehicleId && (
        <div className="wizard-substep">
          <p className="wizard-instruction">
            ¿Cuál fue la zona de impacto de <b>{currentZoneVehicleId}</b>?
          </p>
          <div className="wizard-chips-row">
            {IMPACT_ZONE_OPTIONS.map((opt) => {
              const isSelected = impactZones[currentZoneVehicleId] === opt.id
              return (
                <button
                  type="button"
                  key={opt.id}
                  className={`wizard-chip ${isSelected ? "primary active" : ""}`}
                  onClick={() => {
                    onSetImpactZone(currentZoneVehicleId, opt.id)
                    if (activeZoneVehicleIdx < impactVehicles.length - 1) {
                      setActiveZoneVehicleIdx((prev) => prev + 1)
                    } else {
                      onSetSubstep("ask_more")
                    }
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="wizard-chips-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={() => onSetSubstep("ask_more")}
            >
              Continuar
            </button>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("select_vehicles")}
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* 4. ¿Quieres agregar algo más? */}
      {substep === "ask_more" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant confirmation">
            <p>¿Quieres agregar algún elemento pericial adicional a la escena?</p>
          </div>
          <div className="wizard-chips-row vertical-stack">
            <button
              type="button"
              className="wizard-chip"
              onClick={() => {
                onAddEvidence()
                onSetSubstep("add_evidence")
              }}
            >
              🏷️ Evidencia (E1, E2, huellas, restos)
            </button>
            <button
              type="button"
              className="wizard-chip"
              onClick={() => {
                onAddSignal()
                onSetSubstep("add_signal")
              }}
            >
              🛑 Señalización y semáforos
            </button>
            <button
              type="button"
              className="wizard-chip"
              onClick={() => {
                onStartMeasure()
                onSetSubstep("measure")
              }}
            >
              📏 Medir distancias en el mapa
            </button>
            <button
              type="button"
              className="wizard-chip primary"
              onClick={onFinishImpact}
              style={{ marginTop: 6 }}
            >
              ✓ Ya terminé · Pasar a Posición Final
            </button>
          </div>
        </div>
      )}

      {/* Mini-flujos */}
      {substep === "add_evidence" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>Toca el mapa o arrastra el elemento para posicionar el indicio/evidencia.</p>
          </div>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip primary"
              onClick={() => onSetSubstep("ask_more")}
            >
              ✓ Listo, volver
            </button>
          </div>
        </div>
      )}

      {substep === "add_signal" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>Selecciona la señal vial deseada y arrástrala sobre la intersección o calzada.</p>
          </div>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip primary"
              onClick={() => onSetSubstep("ask_more")}
            >
              ✓ Listo, volver
            </button>
          </div>
        </div>
      )}

      {substep === "measure" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>Modo medición activo. Haz clic entre dos puntos en el mapa para calcular la distancia en metros.</p>
          </div>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip primary"
              onClick={() => onSetSubstep("ask_more")}
            >
              ✓ Listo, volver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
