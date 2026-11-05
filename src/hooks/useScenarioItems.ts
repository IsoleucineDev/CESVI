import { useState } from "react"
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_VEHICLE_POSITIONS,
  EVIDENCE_POSITIONS,
  IMPACT_POSITION,
  type DroppedItem,
  type GeoPosition,
  type GeoVehicle,
} from "../types/scenario"

export function useScenarioItems() {
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([])
  const [selectedDroppedId, setSelectedDroppedId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState("V1")
  const [lastRemovedItem, setLastRemovedItem] = useState<DroppedItem | null>(null)
  const [mapVehicles, setMapVehicles] = useState<Record<"V1" | "V2", GeoVehicle>>({
    V1: { ...DEFAULT_VEHICLE_POSITIONS.V1, scale: 1 },
    V2: { ...DEFAULT_VEHICLE_POSITIONS.V2, scale: 1 },
  })
  const [impactPosition, setImpactPosition] = useState<GeoPosition>(IMPACT_POSITION)
  const [evidencePositions, setEvidencePositions] = useState(EVIDENCE_POSITIONS)

  const addItem = (item: Pick<DroppedItem, "kind" | "label">, position: GeoPosition) => {
    const id = `${Date.now()}-${droppedItems.length}`
    const newItem: DroppedItem = {
      ...item,
      id,
      rotation: 0,
      scale: 1,
      ...position,
    }
    setDroppedItems((current) => [...current, newItem])
    setSelectedDroppedId(id)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
    return newItem
  }

  const addCatalogItem = (
    item: string,
    kind: DroppedItem["kind"],
    center: { lat: number; lng: number } = {
      lat: DEFAULT_MAP_CENTER[0],
      lng: DEFAULT_MAP_CENTER[1],
    },
  ) => {
    const id = `${Date.now()}-${droppedItems.length}`
    const offset = (droppedItems.length % 5) * 2
    const newItem: DroppedItem = {
      id,
      kind,
      label: item,
      rotation: 0,
      scale: 1,
      lat: center.lat + (offset - 2) * 0.0001,
      lng: center.lng + (offset - 2) * 0.0001,
    }
    setDroppedItems((current) => [...current, newItem])
    setSelectedDroppedId(id)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
    return newItem
  }

  const moveDropped = (id: string, position: GeoPosition) => {
    setDroppedItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...position } : item,
      ),
    )
  }

  const moveVehicle = (id: "V1" | "V2", position: GeoPosition) => {
    setMapVehicles((current) => ({
      ...current,
      [id]: { ...current[id], ...position },
    }))
  }

  const moveImpact = (position: GeoPosition) => {
    setImpactPosition(position)
  }

  const moveEvidence = (label: string, position: GeoPosition) => {
    setEvidencePositions((current) =>
      current.map((e) => (e.label === label ? { ...e, ...position } : e)),
    )
  }

  const rotateDropped = (id: string, rotation: number) => {
    setDroppedItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, rotation } : item,
      ),
    )
  }

  const rotateVehicle = (id: "V1" | "V2", rotation: number) => {
    setMapVehicles((current) => ({
      ...current,
      [id]: { ...current[id], rotation },
    }))
  }

  const scaleDropped = (id: string, scale: number) => {
    setDroppedItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, scale } : item,
      ),
    )
  }

  const scaleVehicle = (id: "V1" | "V2", scale: number) => {
    setMapVehicles((current) => ({
      ...current,
      [id]: { ...current[id], scale },
    }))
  }

  const undoLastItem = (): DroppedItem | null => {
    let removedItem: DroppedItem | null = null
    setDroppedItems((current) => {
      const removed = current.at(-1)
      if (!removed) return current
      removedItem = removed
      setLastRemovedItem(removed)
      setSelectedDroppedId(null)
      return current.slice(0, -1)
    })
    return removedItem
  }

  const redoLastItem = (): DroppedItem | null => {
    if (!lastRemovedItem) return null
    const restored = lastRemovedItem
    setDroppedItems((current) => [...current, restored])
    setSelectedDroppedId(restored.id)
    setLastRemovedItem(null)
    return restored
  }

  const resetItems = () => {
    setDroppedItems([])
    setSelectedDroppedId(null)
    setLastRemovedItem(null)
  }

  return {
    droppedItems,
    setDroppedItems,
    selectedDroppedId,
    setSelectedDroppedId,
    selectedVehicleId,
    setSelectedVehicleId,
    lastRemovedItem,
    mapVehicles,
    setMapVehicles,
    impactPosition,
    setImpactPosition,
    evidencePositions,
    setEvidencePositions,
    addItem,
    addCatalogItem,
    moveDropped,
    moveVehicle,
    moveImpact,
    moveEvidence,
    rotateDropped,
    rotateVehicle,
    scaleDropped,
    scaleVehicle,
    undoLastItem,
    redoLastItem,
    resetItems,
  }
}
