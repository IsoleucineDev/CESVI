import { MapContainer, TileLayer, ZoomControl } from "react-leaflet"
import type { Map as LeafletMap } from "leaflet"
import GeoMapOverlay from "./GeoMapOverlay"
import MapViewport from "./MapViewport"
import MapInstanceBridge from "./MapInstanceBridge"
import MapToolbar from "./MapToolbar"
import ObjectInspector from "./ObjectInspector"
import {
  DEFAULT_MAP_CENTER,
  type DroppedItem,
  type GeoPosition,
  type GeoVehicle,
} from "../../types/scenario"

type MapCanvasProps = {
  mapMode: "select" | "pan" | "measure"
  onSelectMapMode: (mode: "select" | "pan" | "measure") => void
  mapTheme: "base" | "technical"
  mapViewMode: "location" | "scenario"
  mapViewCenter: [number, number]
  mapViewZoom: number
  mapCenter: [number, number]
  mapInstance: LeafletMap | null
  onMapInit: (map: LeafletMap) => void
  currentZoom: number
  onZoomChange: (zoom: number) => void
  droppedItems: DroppedItem[]
  mapVehicles: Record<"V1" | "V2", GeoVehicle>
  impactPosition: GeoPosition
  evidencePositions: { lat: number; lng: number; label: string }[]
  selectedDroppedId: string | null
  selectedVehicleId: string
  onDropItem: (item: Pick<DroppedItem, "kind" | "label">, position: GeoPosition) => void
  onSelectDropped: (id: string) => void
  onSelectVehicle: (id: "V1" | "V2") => void
  onMoveDropped: (id: string, position: GeoPosition) => void
  onMoveVehicle: (id: "V1" | "V2", position: GeoPosition) => void
  onMoveImpact: (position: GeoPosition) => void
  onMoveEvidence: (label: string, position: GeoPosition) => void
  onRotateDropped: (id: string, rotation: number) => void
  onRotateVehicle: (id: "V1" | "V2", rotation: number) => void
  onScaleDropped: (id: string, scale: number) => void
  onScaleVehicle: (id: "V1" | "V2", scale: number) => void
  inspectorOpen: boolean
  onCloseInspector: () => void
  onOpenInspector: () => void
}

export default function MapCanvas({
  mapMode,
  onSelectMapMode,
  mapTheme,
  mapViewMode,
  mapViewCenter,
  mapViewZoom,
  mapCenter,
  mapInstance,
  onMapInit,
  currentZoom,
  onZoomChange,
  droppedItems,
  mapVehicles,
  impactPosition,
  evidencePositions,
  selectedDroppedId,
  selectedVehicleId,
  onDropItem,
  onSelectDropped,
  onSelectVehicle,
  onMoveDropped,
  onMoveVehicle,
  onMoveImpact,
  onMoveEvidence,
  onRotateDropped,
  onRotateVehicle,
  onScaleDropped,
  onScaleVehicle,
  inspectorOpen,
  onCloseInspector,
  onOpenInspector,
}: MapCanvasProps) {
  return (
    <div
      className={`map-canvas ${
        mapMode === "pan" ? "is-pan-mode" : ""
      } ${mapTheme === "technical" ? "is-technical" : ""}`}
    >
      <MapContainer
        className="leaflet-map"
        center={DEFAULT_MAP_CENTER}
        zoom={15}
        zoomControl={false}
        attributionControl
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport center={mapViewCenter} zoom={mapViewZoom} />
        <MapInstanceBridge onMapInit={onMapInit} onZoomChange={onZoomChange} />
        <GeoMapOverlay
          mode={mapViewMode}
          mapCenter={mapCenter}
          droppedItems={droppedItems}
          mapVehicles={mapVehicles}
          impactPosition={impactPosition}
          evidencePositions={evidencePositions}
          selectedDroppedId={selectedDroppedId}
          selectedVehicleId={selectedVehicleId}
          onDropItem={onDropItem}
          onSelectDropped={onSelectDropped}
          onSelectVehicle={onSelectVehicle}
          onMoveDropped={onMoveDropped}
          onMoveVehicle={onMoveVehicle}
          onMoveImpact={onMoveImpact}
          onMoveEvidence={onMoveEvidence}
          onRotateDropped={onRotateDropped}
          onRotateVehicle={onRotateVehicle}
          onScaleDropped={onScaleDropped}
          onScaleVehicle={onScaleVehicle}
        />
      </MapContainer>

      <MapToolbar
        mapMode={mapMode}
        onSelectMapMode={onSelectMapMode}
        currentZoom={currentZoom}
        onZoomIn={() => mapInstance?.zoomIn()}
        onZoomOut={() => mapInstance?.zoomOut()}
        onResetView={() => {
          if (mapInstance) {
            mapInstance.setView(mapViewCenter, mapViewZoom)
            onZoomChange(mapViewZoom)
          }
        }}
        onResetNorth={() => mapInstance?.setView(mapCenter, currentZoom)}
      />

      <ObjectInspector
        isOpen={inspectorOpen}
        onClose={onCloseInspector}
        onOpen={onOpenInspector}
      />
    </div>
  )
}
