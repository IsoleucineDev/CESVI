import Button from "../ui/Button"
import Icon from "../ui/Icon"

type MapToolbarProps = {
  mapMode: "select" | "pan" | "measure"
  onSelectMapMode: (mode: "select" | "pan" | "measure") => void
  currentZoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onResetNorth: () => void
}

export default function MapToolbar({
  mapMode,
  onSelectMapMode,
  currentZoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetNorth,
}: MapToolbarProps) {
  return (
    <>
      <div className="map-toolbar">
        <Button
          className={`map-tool ${mapMode === "select" ? "is-active" : ""}`}
          onClick={() => onSelectMapMode("select")}
          title="Seleccionar y mover objetos"
        >
          <span className="cursor-arrow">↖</span>
        </Button>
        <Button
          className={`map-tool ${mapMode === "pan" ? "is-active" : ""}`}
          onClick={() => onSelectMapMode("pan")}
          title="Mover mapa"
        >
          <Icon name="map" size={17} />
        </Button>
        <Button
          className={`map-tool ${mapMode === "measure" ? "is-active" : ""}`}
          onClick={() => onSelectMapMode("measure")}
          title="Medir"
        >
          <span className="ruler-icon">⌁</span>
        </Button>
      </div>

      <div className="zoom-controls">
        <Button
          className="map-tool"
          onClick={onZoomIn}
          title="Acercar (Zoom In)"
        >
          <Icon name="plus" size={16} />
        </Button>
        <Button
          className="zoom-value"
          onClick={onResetView}
          title="Restablecer vista a escala predeterminada"
        >
          {Math.round(Math.pow(2, currentZoom - 19) * 100)}%
        </Button>
        <Button
          className="map-tool"
          onClick={onZoomOut}
          title="Alejar (Zoom Out)"
        >
          <Icon name="minus" size={16} />
        </Button>
      </div>

      <div className="north-indicator" onClick={onResetNorth} title="Norte geográfico">
        <span>N</span>
        <i />
      </div>
    </>
  )
}
