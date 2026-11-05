import { useState } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"
import type { GeoPosition } from "../../lib/geo"

type StepInicioProps = {
  locationQuery: string
  anchor: GeoPosition
  substep: "ask_address" | "confirm_address" | "adjust_pin"
  onSetSubstep: (substep: "ask_address" | "confirm_address" | "adjust_pin") => void
  onConfirmLocation: () => void
  onSearchEnter: (query: string) => void
  isSearching?: boolean
}

export default function StepInicio({
  locationQuery,
  anchor,
  substep,
  onSetSubstep,
  onConfirmLocation,
  onSearchEnter,
  isSearching = false,
}: StepInicioProps) {
  const [manualInput, setManualInput] = useState("")

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    onSearchEnter(manualInput.trim())
  }

  return (
    <div className="wizard-step wizard-step-inicio" role="region" aria-label="Escena 01: Inicio">
      <div className="wizard-chat-bubble assistant">
        <p className="wizard-message">
          Hola, soy el asistente pericial. Vamos a reconstruir el siniestro paso a paso.
        </p>
        <p className="wizard-message-highlight">
          ¿En qué calle o dirección ocurrió?
        </p>
        {locationQuery && (
          <div className="wizard-current-data">
            <span className="data-badge">
              <Icon name="map" size={14} />
              {locationQuery}
            </span>
            <small className="coords-text">
              ({anchor.lat.toFixed(5)}, {anchor.lng.toFixed(5)})
            </small>
          </div>
        )}
      </div>

      {substep === "ask_address" && (
        <div className="wizard-substep">
          <p className="wizard-instruction">
            Escribe la dirección en el buscador superior o ingresa una dirección rápida aquí:
          </p>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip"
              onClick={() => onSearchEnter("Plaza de la Constitución, Zócalo CDMX")}
            >
              📍 Zócalo CDMX
            </button>
            <button
              type="button"
              className="wizard-chip"
              onClick={() => onSearchEnter("Avenida Sebastián Lerdo de Tejada, Toluca")}
            >
              📍 Lerdo de Tejada, Toluca
            </button>
            <button
              type="button"
              className="wizard-chip"
              onClick={() => onSearchEnter("Paseo de la Reforma, CDMX")}
            >
              📍 Paseo de la Reforma
            </button>
          </div>

          <form onSubmit={handleManualSearch} className="wizard-inline-search">
            <input
              type="text"
              className="wizard-input"
              placeholder="Ej. Insurgentes Sur 1602, Benito Juárez"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              disabled={isSearching}
              aria-label="Dirección del siniestro"
            />
            <Button
              type="submit"
              className="wizard-submit-btn"
              disabled={!manualInput.trim() || isSearching}
            >
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </form>
          <div
            className="osm-attribution-note"
            style={{ fontSize: "10px", color: "var(--muted)", marginTop: "8px" }}
          >
            Búsqueda de direcciones vía Nominatim · &copy;{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#38bdf8", textDecoration: "underline" }}
            >
              OpenStreetMap
            </a>{" "}
            contributors
          </div>
        </div>
      )}

      {substep === "confirm_address" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant confirmation">
            <p>¿Es aquí? Puedes arrastrar el pin rojo en el mapa para ajustar la ubicación exacta.</p>
          </div>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip primary"
              onClick={onConfirmLocation}
            >
              ✓ Sí, continuar
            </button>
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={() => onSetSubstep("adjust_pin")}
            >
              🎯 Ajustar pin
            </button>
            <button
              type="button"
              className="wizard-chip text-only"
              onClick={() => onSetSubstep("ask_address")}
            >
              Cambiar dirección
            </button>
          </div>
        </div>
      )}

      {substep === "adjust_pin" && (
        <div className="wizard-substep">
          <div className="wizard-chat-bubble assistant highlight">
            <p>
              Arrastra el pin rojo en el mapa interactivo hasta el punto exacto de la vía y presiona
              &quot;Listo, continuar&quot;.
            </p>
          </div>
          <div className="wizard-chips-row">
            <button
              type="button"
              className="wizard-chip primary"
              onClick={onConfirmLocation}
            >
              ✓ Listo, continuar
            </button>
            <button
              type="button"
              className="wizard-chip secondary"
              onClick={() => onSetSubstep("confirm_address")}
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
