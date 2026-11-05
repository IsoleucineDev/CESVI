import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type DroppedItem,
  type GeoPosition,
  type GeoVehicle,
  type MenuKey,
  DEFAULT_VEHICLE_OFFSETS,
  DEFAULT_IMPACT_OFFSET,
  DEFAULT_EVIDENCE_OFFSETS,
} from "../types/scenario"
import { toLatLng, toOffsetM } from "../lib/geo.ts"
import {
  DEFAULT_CASE_ID,
  loadSavedCase,
  saveCase,
  type RelativeItem,
  type RelativeVehicle,
  type RelativeEvidence,
} from "../lib/migration.ts"

export function useScenarioItems(
  anchor: GeoPosition,
  locationQuery = "Ubicación del siniestro",
  caseId = DEFAULT_CASE_ID,
) {
  const initialLoaded = useRef(false)

  // Estados relativos al ancla (en metros ENU)
  const [relativeVehicles, setRelativeVehicles] = useState<Record<"V1" | "V2", RelativeVehicle>>(() => {
    const saved = typeof window !== "undefined" ? loadSavedCase(caseId) : null
    return saved?.vehicles ?? JSON.parse(JSON.stringify(DEFAULT_VEHICLE_OFFSETS))
  })

  const [relativeImpact, setRelativeImpact] = useState<{ x: number; y: number }>(() => {
    const saved = typeof window !== "undefined" ? loadSavedCase(caseId) : null
    return saved?.impact ?? { ...DEFAULT_IMPACT_OFFSET }
  })

  const [relativeEvidence, setRelativeEvidence] = useState<RelativeEvidence[]>(() => {
    const saved = typeof window !== "undefined" ? loadSavedCase(caseId) : null
    return saved?.evidence ?? JSON.parse(JSON.stringify(DEFAULT_EVIDENCE_OFFSETS))
  })

  const [relativeDropped, setRelativeDropped] = useState<RelativeItem[]>(() => {
    const saved = typeof window !== "undefined" ? loadSavedCase(caseId) : null
    return saved?.droppedItems ?? []
  })

  const [selectedDroppedId, setSelectedDroppedId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState("V1")
  const [lastRemovedItem, setLastRemovedItem] = useState<RelativeItem | null>(null)

  // Coordenadas calculadas WGS84 para Leaflet basadas en el anchor actual
  const mapVehicles = useMemo<Record<"V1" | "V2", GeoVehicle>>(() => ({
    V1: {
      ...toLatLng(anchor, relativeVehicles.V1),
      rotation: relativeVehicles.V1.rotation,
      scale: relativeVehicles.V1.scale ?? 1,
    },
    V2: {
      ...toLatLng(anchor, relativeVehicles.V2),
      rotation: relativeVehicles.V2.rotation,
      scale: relativeVehicles.V2.scale ?? 1,
    },
  }), [anchor, relativeVehicles])

  const impactPosition = useMemo<GeoPosition>(
    () => toLatLng(anchor, relativeImpact),
    [anchor, relativeImpact],
  )

  const evidencePositions = useMemo(
    () =>
      relativeEvidence.map((e) => ({
        label: e.label,
        ...toLatLng(anchor, e),
      })),
    [anchor, relativeEvidence],
  )

  const droppedItems = useMemo<DroppedItem[]>(
    () =>
      relativeDropped.map((item) => ({
        ...item,
        ...toLatLng(anchor, item),
      })),
    [anchor, relativeDropped],
  )

  // Autosave a localStorage cuando cambia la geometría relativa o el ancla
  useEffect(() => {
    if (!initialLoaded.current) {
      initialLoaded.current = true
      return
    }
    saveCase(
      {
        version: 2,
        anchor,
        locationQuery,
        vehicles: relativeVehicles,
        impact: relativeImpact,
        evidence: relativeEvidence,
        droppedItems: relativeDropped,
        savedAt: new Date().toISOString(),
      },
      caseId,
    )
  }, [anchor, locationQuery, relativeVehicles, relativeImpact, relativeEvidence, relativeDropped, caseId])

  const addItem = (item: Pick<DroppedItem, "kind" | "label">, position: GeoPosition) => {
    const id = `${Date.now()}-${relativeDropped.length}`
    const offset = toOffsetM(anchor, position)
    const newItem: RelativeItem = {
      ...item,
      id,
      rotation: 0,
      scale: 1,
      x: offset.x,
      y: offset.y,
    }
    setRelativeDropped((current) => [...current, newItem])
    setSelectedDroppedId(id)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
    return { ...newItem, ...position }
  }

  const addCatalogItem = (
    item: string,
    kind: DroppedItem["kind"],
    center?: GeoPosition,
  ) => {
    const id = `${Date.now()}-${relativeDropped.length}`
    const step = (relativeDropped.length % 5) * 4
    let offsetM: { x: number; y: number }
    if (center) {
      const baseOffset = toOffsetM(anchor, center)
      offsetM = { x: baseOffset.x + (step - 8), y: baseOffset.y + (step - 8) }
    } else {
      offsetM = { x: step - 8, y: step - 8 }
    }

    const newItem: RelativeItem = {
      id,
      kind,
      label: item,
      rotation: 0,
      scale: 1,
      x: offsetM.x,
      y: offsetM.y,
    }
    setRelativeDropped((current) => [...current, newItem])
    setSelectedDroppedId(id)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
    return { ...newItem, ...toLatLng(anchor, offsetM) }
  }

  const moveDropped = useCallback((id: string, position: GeoPosition) => {
    const offset = toOffsetM(anchor, position)
    setRelativeDropped((current) =>
      current.map((item) =>
        item.id === id ? { ...item, x: offset.x, y: offset.y } : item,
      ),
    )
  }, [anchor])

  const moveVehicle = useCallback((id: "V1" | "V2", position: GeoPosition) => {
    const offset = toOffsetM(anchor, position)
    setRelativeVehicles((current) => ({
      ...current,
      [id]: { ...current[id], x: offset.x, y: offset.y },
    }))
  }, [anchor])

  const moveImpact = useCallback((position: GeoPosition) => {
    const offset = toOffsetM(anchor, position)
    setRelativeImpact(offset)
  }, [anchor])

  const moveEvidence = useCallback((label: string, position: GeoPosition) => {
    const offset = toOffsetM(anchor, position)
    setRelativeEvidence((current) =>
      current.map((e) => (e.label === label ? { ...e, x: offset.x, y: offset.y } : e)),
    )
  }, [anchor])

  const rotateDropped = (id: string, rotation: number) => {
    setRelativeDropped((current) =>
      current.map((item) => (item.id === id ? { ...item, rotation } : item)),
    )
  }

  const rotateVehicle = (id: "V1" | "V2", rotation: number) => {
    setRelativeVehicles((current) => ({
      ...current,
      [id]: { ...current[id], rotation },
    }))
  }

  const scaleDropped = (id: string, scale: number) => {
    setRelativeDropped((current) =>
      current.map((item) => (item.id === id ? { ...item, scale } : item)),
    )
  }

  const scaleVehicle = (id: "V1" | "V2", scale: number) => {
    setRelativeVehicles((current) => ({
      ...current,
      [id]: { ...current[id], scale },
    }))
  }

  const undoLastItem = (): DroppedItem | null => {
    let removedItem: RelativeItem | null = null
    setRelativeDropped((current) => {
      const removed = current.at(-1)
      if (!removed) return current
      removedItem = removed
      setLastRemovedItem(removed)
      setSelectedDroppedId(null)
      return current.slice(0, -1)
    })
    const item = removedItem as RelativeItem | null
    return item ? { ...item, ...toLatLng(anchor, item) } : null
  }

  const redoLastItem = (): DroppedItem | null => {
    if (!lastRemovedItem) return null
    const restored = lastRemovedItem
    setRelativeDropped((current) => [...current, restored])
    setSelectedDroppedId(restored.id)
    setLastRemovedItem(null)
    return { ...restored, ...toLatLng(anchor, restored) }
  }

  const resetItems = () => {
    setRelativeDropped([])
    setRelativeVehicles(JSON.parse(JSON.stringify(DEFAULT_VEHICLE_OFFSETS)))
    setRelativeImpact({ ...DEFAULT_IMPACT_OFFSET })
    setRelativeEvidence(JSON.parse(JSON.stringify(DEFAULT_EVIDENCE_OFFSETS)))
    setSelectedDroppedId(null)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
  }

  // Compatibilidad con firmas de setters que usen array/objeto
  const setDroppedItems = (
    updater: DroppedItem[] | ((curr: DroppedItem[]) => DroppedItem[]),
  ) => {
    if (typeof updater === "function") {
      setRelativeDropped((curr) => {
        const computed = curr.map((it) => ({ ...it, ...toLatLng(anchor, it) }))
        const next = updater(computed)
        return next.map((it) => {
          const off = toOffsetM(anchor, { lat: it.lat, lng: it.lng })
          return { ...it, x: off.x, y: off.y }
        })
      })
    } else {
      setRelativeDropped(
        updater.map((it) => {
          const off = toOffsetM(anchor, { lat: it.lat, lng: it.lng })
          return { ...it, x: off.x, y: off.y }
        }),
      )
    }
  }

  const setMapVehicles = (
    updater:
      | Record<"V1" | "V2", GeoVehicle>
      | ((curr: Record<"V1" | "V2", GeoVehicle>) => Record<"V1" | "V2", GeoVehicle>),
  ) => {
    if (typeof updater === "function") {
      setRelativeVehicles((curr) => {
        const computed = {
          V1: { ...toLatLng(anchor, curr.V1), rotation: curr.V1.rotation, scale: curr.V1.scale ?? 1 },
          V2: { ...toLatLng(anchor, curr.V2), rotation: curr.V2.rotation, scale: curr.V2.scale ?? 1 },
        }
        const next = updater(computed)
        return {
          V1: { ...toOffsetM(anchor, next.V1), rotation: next.V1.rotation, scale: next.V1.scale ?? 1 },
          V2: { ...toOffsetM(anchor, next.V2), rotation: next.V2.rotation, scale: next.V2.scale ?? 1 },
        }
      })
    } else {
      setRelativeVehicles({
        V1: { ...toOffsetM(anchor, updater.V1), rotation: updater.V1.rotation, scale: updater.V1.scale ?? 1 },
        V2: { ...toOffsetM(anchor, updater.V2), rotation: updater.V2.rotation, scale: updater.V2.scale ?? 1 },
      })
    }
  }

  const setImpactPosition = (pos: GeoPosition) => {
    setRelativeImpact(toOffsetM(anchor, pos))
  }

  const setEvidencePositions = (
    evs: { lat: number; lng: number; label: string }[],
  ) => {
    setRelativeEvidence(
      evs.map((e) => ({
        label: e.label,
        ...toOffsetM(anchor, e),
      })),
    )
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
    relativeVehicles,
    relativeImpact,
    relativeEvidence,
    relativeDropped,
  }
}
