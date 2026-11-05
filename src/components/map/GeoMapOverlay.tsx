import { Fragment, useEffect, useRef, useState } from "react"
import { useMap, useMapEvents } from "react-leaflet"
import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet"
import Icon from "../ui/Icon"
import VehicleSprite from "../ui/VehicleSprite"
import {
  type DragState,
  type DroppedItem,
  type GeoPosition,
  type GeoVehicle,
  getDroppedItemIcon,
  getPixelsPerMeter,
  getVehicleDimensions,
  getVehicleVariant,
} from "../../types/scenario"

export default function GeoMapOverlay({
  mode,
  mapCenter,
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
  onMoveAnchor,
  onMapClick,
}: {
  mode: "location" | "scenario"
  mapCenter: [number, number]
  droppedItems: DroppedItem[]
  mapVehicles: Record<string, GeoVehicle>
  impactPosition: GeoPosition
  evidencePositions: { lat: number; lng: number; label: string }[]
  selectedDroppedId: string | null
  selectedVehicleId: string
  onDropItem: (item: Pick<DroppedItem, "kind" | "label">, position: GeoPosition) => void
  onSelectDropped: (id: string) => void
  onSelectVehicle: (id: string) => void
  onMoveDropped: (id: string, position: GeoPosition) => void
  onMoveVehicle: (id: string, position: GeoPosition) => void
  onMoveImpact: (position: GeoPosition) => void
  onMoveEvidence: (label: string, position: GeoPosition) => void
  onRotateDropped: (id: string, rotation: number) => void
  onRotateVehicle: (id: string, rotation: number) => void
  onScaleDropped: (id: string, scale: number) => void
  onScaleVehicle: (id: string, scale: number) => void
  onMoveAnchor?: (position: GeoPosition) => void
  onMapClick?: (position: GeoPosition) => void
}) {
  const map = useMap()
  const [, redraw] = useState(0)
  const dragRef = useRef<DragState | null>(null)

  useMapEvents({
    move: () => redraw((v) => v + 1),
    zoom: () => redraw((v) => v + 1),
    viewreset: () => redraw((v) => v + 1),
    click: (e) => {
      if (dragRef.current) return
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    const handleDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("application/x-cesvi-item")) {
        event.preventDefault()
      }
    }
    const handleDrop = (event: DragEvent) => {
      const payload = event.dataTransfer?.getData("application/x-cesvi-item")
      if (!payload) return
      event.preventDefault()
      try {
        const item = JSON.parse(payload) as Pick<DroppedItem, "kind" | "label">
        const rect = container.getBoundingClientRect()
        const point = map.containerPointToLatLng([
          event.clientX - rect.left,
          event.clientY - rect.top,
        ])
        onDropItem(item, { lat: point.lat, lng: point.lng })
      } catch {
        // Ignore malformed payloads
      }
    }
    container.addEventListener("dragover", handleDragOver)
    container.addEventListener("drop", handleDrop)
    return () => {
      container.removeEventListener("dragover", handleDragOver)
      container.removeEventListener("drop", handleDrop)
    }
  }, [map, onDropItem])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current) return
      event.preventDefault()
      const rect = map.getContainer().getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top

      const { type, id, mode: dragMode, pointerOffset, centerPoint, initialDistance, startScale } = dragRef.current

      if (dragMode === "move") {
        const targetPoint = L.point(pointerX - pointerOffset.x, pointerY - pointerOffset.y)
        const newLatLng = map.containerPointToLatLng(targetPoint)
        const pos = { lat: newLatLng.lat, lng: newLatLng.lng }
        if (type === "vehicle") {
          onMoveVehicle(id as "V1" | "V2", pos)
        } else if (type === "dropped") {
          onMoveDropped(id, pos)
        } else if (type === "impact") {
          onMoveImpact(pos)
        } else if (type === "evidence") {
          onMoveEvidence(id, pos)
        } else if (type === "anchor" && onMoveAnchor) {
          onMoveAnchor(pos)
        }
      } else if (dragMode === "rotate") {
        const dx = pointerX - centerPoint.x
        const dy = pointerY - centerPoint.y
        let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360
        if (angle < 0) angle += 360
        if (type === "vehicle") {
          onRotateVehicle(id as "V1" | "V2", angle)
        } else if (type === "dropped") {
          onRotateDropped(id, angle)
        }
      } else if (dragMode === "scale") {
        const curDist = Math.hypot(pointerX - centerPoint.x, pointerY - centerPoint.y)
        const nextScale = Math.min(2.5, Math.max(0.4, (curDist / Math.max(5, initialDistance)) * startScale))
        if (type === "vehicle") {
          onScaleVehicle(id as "V1" | "V2", Number(nextScale.toFixed(2)))
        } else if (type === "dropped") {
          onScaleDropped(id, Number(nextScale.toFixed(2)))
        }
      }
    }

    const handlePointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        map.dragging.enable()
        redraw((v) => v + 1)
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [map, onMoveAnchor, onMoveDropped, onMoveEvidence, onMoveImpact, onMoveVehicle, onRotateDropped, onRotateVehicle, onScaleDropped, onScaleVehicle])

  const beginDrag = (
    event: React.PointerEvent,
    type: DragState["type"],
    id: string,
    dragMode: DragState["mode"],
  ) => {
    event.preventDefault()
    event.stopPropagation()
    map.dragging.disable()

    const rect = map.getContainer().getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top

    let centerLatLng: GeoPosition
    let startScale = 1
    let startRotation = 0

    if (type === "anchor") {
      centerLatLng = { lat: mapCenter[0], lng: mapCenter[1] }
    } else if (type === "vehicle") {
      const v = mapVehicles[id as "V1" | "V2"]
      centerLatLng = { lat: v.lat, lng: v.lng }
      startScale = v.scale ?? 1
      startRotation = v.rotation
      onSelectVehicle(id as "V1" | "V2")
    } else if (type === "dropped") {
      const item = droppedItems.find((d) => d.id === id)
      if (!item) return
      centerLatLng = { lat: item.lat, lng: item.lng }
      startScale = item.scale ?? 1
      startRotation = item.rotation
      onSelectDropped(id)
    } else if (type === "impact") {
      centerLatLng = impactPosition
    } else {
      const ev = evidencePositions.find((e) => e.label === id)
      if (!ev) return
      centerLatLng = { lat: ev.lat, lng: ev.lng }
    }

    const centerPoint = map.latLngToContainerPoint(centerLatLng)
    const initialDistance = Math.max(5, Math.hypot(pointerX - centerPoint.x, pointerY - centerPoint.y))

    dragRef.current = {
      type,
      id,
      mode: dragMode,
      pointerOffset: {
        x: pointerX - centerPoint.x,
        y: pointerY - centerPoint.y,
      },
      centerPoint,
      startRotation,
      startScale,
      initialDistance,
    }
  }

  return (
    <div className="geo-overlay-layer" aria-label="Elementos geográficos del mapa">
      {mode === "location" && (() => {
        const pin = map.latLngToContainerPoint({ lat: mapCenter[0], lng: mapCenter[1] })
        return (
          <div
            className="geo-location-pin"
            style={{ left: pin.x, top: pin.y, cursor: onMoveAnchor ? "grab" : "default" }}
            onPointerDown={onMoveAnchor ? (event) => beginDrag(event, "anchor", "anchor", "move") : undefined}
            title="Pin de ubicación · Arrastra para ajustar ubicación exacta"
          >
            <span />
          </div>
        )
      })()}

      {/* Trayectorias previas de aproximación */}
      {Object.keys(mapVehicles).map((id) => {
        const vehicle = mapVehicles[id]
        if (!vehicle?.trajectoryPoints || vehicle.trajectoryPoints.length === 0) return null
        const vehiclePt = map.latLngToContainerPoint(vehicle)
        const pts = vehicle.trajectoryPoints.map((p) => map.latLngToContainerPoint(p))
        const allPts = [...pts, vehiclePt]
        const pathData = allPts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
        return (
          <svg
            key={`traj-${id}`}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 400 }}
          >
            <path
              d={pathData}
              fill="none"
              stroke="var(--accent, #0084ad)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.85"
            />
            {pts.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="var(--accent, #0084ad)" />
            ))}
          </svg>
        )
      })}

      {Object.keys(mapVehicles).map((id) => {
        const vehicle = mapVehicles[id]
        if (!vehicle) return null
        const pt = map.latLngToContainerPoint(vehicle)
        const ppm = getPixelsPerMeter(map, vehicle)
        const { lengthMeters, widthMeters } = getVehicleDimensions("car", vehicle.scale || 1)
        const pixelWidth = widthMeters * ppm
        const pixelHeight = lengthMeters * ppm
        const displayWidth = Math.max(10, pixelWidth)
        const displayHeight = Math.max(18, pixelHeight)
        const isSelected = selectedVehicleId === id

        const angleRad = (vehicle.rotation * Math.PI) / 180
        const handleOffset = Math.max(26, displayHeight / 2 + 22)
        const rotX = pt.x + handleOffset * Math.sin(angleRad)
        const rotY = pt.y - handleOffset * Math.cos(angleRad)

        const scaleCornerOffset = Math.max(14, Math.hypot(displayWidth, displayHeight) / 2 + 8)
        const cornerAngleRad = ((vehicle.rotation + 135) * Math.PI) / 180
        const scaleX = pt.x + scaleCornerOffset * Math.sin(cornerAngleRad)
        const scaleY = pt.y - scaleCornerOffset * Math.cos(cornerAngleRad)

        return (
          <Fragment key={id}>
            <button
              className={`geo-vehicle vehicle-${id.toLowerCase()} ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelectVehicle(id)}
              onPointerDown={(event) => beginDrag(event, "vehicle", id, "move")}
              style={{
                left: pt.x,
                top: pt.y,
                width: displayWidth,
                height: displayHeight,
                transform: `translate(-50%, -50%) rotate(${vehicle.rotation}deg)`,
              }}
              title={`Vehículo ${id} · Arrastra para mover`}
              type="button"
            >
              <VehicleSprite />
              <span className="direction-line" />
              <b>{id}</b>
            </button>

            {isSelected && (
              <>
                <svg className="geo-connector-svg" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 510 }}>
                  <line
                    stroke="var(--accent, #0084ad)"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                    x1={pt.x + (displayHeight / 2) * Math.sin(angleRad)}
                    y1={pt.y - (displayHeight / 2) * Math.cos(angleRad)}
                    x2={rotX}
                    y2={rotY}
                  />
                </svg>
                <button
                  className="rotation-handle geo-rotation-handle"
                  onPointerDown={(event) => beginDrag(event, "vehicle", id, "rotate")}
                  style={{ left: rotX, top: rotY, transform: "translate(-50%, -50%)" }}
                  title={`Girar ${id} (${vehicle.rotation}°)`}
                  type="button"
                >
                  <Icon name="redo" size={12} />
                </button>
                <button
                  className="scale-handle geo-scale-handle"
                  onPointerDown={(event) => beginDrag(event, "vehicle", id, "scale")}
                  style={{ left: scaleX, top: scaleY, transform: "translate(-50%, -50%)" }}
                  title={`Escalar ${id} (${Math.round((vehicle.scale || 1) * 100)}%)`}
                  type="button"
                >
                  <span />
                </button>
              </>
            )}
          </Fragment>
        )
      })}

      {/* Punto de impacto */}
      {(() => {
        const pt = map.latLngToContainerPoint(impactPosition)
        return (
          <button
            className="geo-impact-marker"
            onPointerDown={(event) => beginDrag(event, "impact", "impact", "move")}
            style={{ left: pt.x, top: pt.y }}
            title="Punto de impacto · Arrastra para reubicar"
            type="button"
          >
            <span />
            <span />
            <span />
            <span />
          </button>
        )
      })()}

      {/* Marcadores de evidencia */}
      {evidencePositions.map((evidence) => {
        const pt = map.latLngToContainerPoint(evidence)
        return (
          <button
            className="geo-evidence-marker"
            key={evidence.label}
            onPointerDown={(event) => beginDrag(event, "evidence", evidence.label, "move")}
            style={{ left: pt.x, top: pt.y }}
            title={`Evidencia ${evidence.label} · Arrastra para reubicar`}
            type="button"
          >
            {evidence.label}
          </button>
        )
      })}

      {/* Elementos colocados del catálogo */}
      {droppedItems.map((item) => {
        const pt = map.latLngToContainerPoint(item)
        const ppm = getPixelsPerMeter(map, item)
        const isVehicle = item.kind === "vehicle" || item.kind === "static-vehicle"

        let displayWidth: number
        let displayHeight: number

        if (isVehicle) {
          const { lengthMeters, widthMeters } = getVehicleDimensions(getVehicleVariant(item.label), item.scale || 1)
          displayWidth = Math.max(10, widthMeters * ppm)
          displayHeight = Math.max(18, lengthMeters * ppm)
        } else {
          const sizeMeters = (item.kind === "human" ? 0.8 : item.kind === "animal" ? 1.2 : 1.5) * (item.scale || 1)
          displayWidth = Math.max(14, sizeMeters * ppm)
          displayHeight = displayWidth
        }

        const isSelected = selectedDroppedId === item.id
        const angleRad = (item.rotation * Math.PI) / 180
        const handleOffset = Math.max(24, displayHeight / 2 + 20)
        const rotX = pt.x + handleOffset * Math.sin(angleRad)
        const rotY = pt.y - handleOffset * Math.cos(angleRad)

        const scaleCornerOffset = Math.max(14, Math.hypot(displayWidth, displayHeight) / 2 + 8)
        const cornerAngleRad = ((item.rotation + 135) * Math.PI) / 180
        const scaleX = pt.x + scaleCornerOffset * Math.sin(cornerAngleRad)
        const scaleY = pt.y - scaleCornerOffset * Math.cos(cornerAngleRad)

        return (
          <Fragment key={item.id}>
            <button
              className={`geo-dropped-item dropped-map-${item.kind} ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelectDropped(item.id)}
              onPointerDown={(event) => beginDrag(event, "dropped", item.id, "move")}
              style={{
                left: pt.x,
                top: pt.y,
                width: displayWidth,
                height: displayHeight,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              }}
              title={`${item.label} · Arrastra para mover`}
              type="button"
            >
              <span className="geo-dropped-symbol">
                {isVehicle ? (
                  <VehicleSprite
                    parked={item.kind === "static-vehicle"}
                    variant={getVehicleVariant(item.label)}
                  />
                ) : (
                  <Icon
                    name={getDroppedItemIcon(item.kind, item.label)}
                    size={Math.min(22, Math.max(12, Math.round(displayWidth * 0.7)))}
                  />
                )}
              </span>
              <span>{item.label}</span>
            </button>

            {isSelected && (
              <>
                <svg className="geo-connector-svg" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 510 }}>
                  <line
                    stroke="var(--accent, #0084ad)"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                    x1={pt.x + (displayHeight / 2) * Math.sin(angleRad)}
                    y1={pt.y - (displayHeight / 2) * Math.cos(angleRad)}
                    x2={rotX}
                    y2={rotY}
                  />
                </svg>
                <button
                  className="rotation-handle geo-rotation-handle"
                  onPointerDown={(event) => beginDrag(event, "dropped", item.id, "rotate")}
                  style={{ left: rotX, top: rotY, transform: "translate(-50%, -50%)" }}
                  title={`Girar ${item.label} (${item.rotation}°)`}
                  type="button"
                >
                  <Icon name="redo" size={12} />
                </button>
                <button
                  className="scale-handle geo-scale-handle"
                  onPointerDown={(event) => beginDrag(event, "dropped", item.id, "scale")}
                  style={{ left: scaleX, top: scaleY, transform: "translate(-50%, -50%)" }}
                  title={`Escalar ${item.label}`}
                  type="button"
                >
                  <span />
                </button>
              </>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
