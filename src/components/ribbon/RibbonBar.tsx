import { useState } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"
import ToolButton from "./ToolButton"
import type { LocationSuggestion } from "../../types/scenario"

type RibbonBarProps = {
  ribbon: string
  activeTools: { icon: any; label: string }[]
  selectedTool: string
  onSelectTool: (tool: string) => void
  locationQuery: string
  onChangeLocationQuery: (query: string) => void
  locationSuggestions: LocationSuggestion[]
  locationSearchLoading: boolean
  onSelectLocationSuggestion: (suggestion: LocationSuggestion) => void
  mapTheme: "base" | "technical"
  onToggleMapTheme: () => void
  onAdjustScene: () => void
  onSearchEnter: (val: string) => void
}

export default function RibbonBar({
  ribbon,
  activeTools,
  selectedTool,
  onSelectTool,
  locationQuery,
  onChangeLocationQuery,
  locationSuggestions,
  locationSearchLoading,
  onSelectLocationSuggestion,
  mapTheme,
  onToggleMapTheme,
  onAdjustScene,
  onSearchEnter,
}: RibbonBarProps) {
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)

  return (
    <section className="ribbon">
      <div className="ribbon-block location-block">
        <span className="block-label">UBICACIÓN</span>
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Buscar ubicación"
            autoComplete="off"
            onBlur={() => window.setTimeout(() => setLocationMenuOpen(false), 120)}
            onChange={(event) => {
              onChangeLocationQuery(event.target.value)
              setLocationMenuOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearchEnter(event.currentTarget.value)
                setLocationMenuOpen(false)
              }
            }}
            value={locationQuery}
          />
          <kbd>↵</kbd>
        </label>
        {locationMenuOpen && (locationSuggestions.length > 0 || locationSearchLoading) && (
          <div className="location-suggestions" role="listbox">
            {locationSearchLoading && (
              <div className="location-suggestion-status">Buscando...</div>
            )}
            {locationSuggestions.map((suggestion) => (
              <button
                className="location-suggestion"
                key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelectLocationSuggestion(suggestion)
                  setLocationMenuOpen(false)
                }}
                role="option"
                type="button"
              >
                {suggestion.display_name}
              </button>
            ))}
          </div>
        )}
        <span className="maps-note">Datos cartográficos · © OpenStreetMap</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-primary">
        {activeTools.map((tool) => (
          <ToolButton
            active={selectedTool === tool.label}
            icon={tool.icon}
            key={tool.label}
            label={tool.label}
            onClick={() => onSelectTool(tool.label)}
          />
        ))}
        {!activeTools.some((tool) => tool.label === selectedTool) && (
          <ToolButton
            active
            icon={
              ribbon === "Vehículos"
                ? "car"
                : ribbon === "Indicios"
                  ? "layers"
                  : "warning"
            }
            label={selectedTool}
            onClick={() => onSelectTool(selectedTool)}
          />
        )}
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-block compact">
        <span className="block-label">CAPAS</span>
        <Button className="small-control" onClick={onToggleMapTheme}>
          <Icon name="layers" size={16} />
          {mapTheme === "base" ? "Mapa base" : "Mapa técnico"}
          <Icon name="chevron" size={14} />
        </Button>
        <Button className="small-control" onClick={onAdjustScene}>
          <Icon name="settings" size={16} />
          Ajustar escena
        </Button>
      </div>
    </section>
  )
}
