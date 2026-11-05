/**
 * Módulo de migración de expedientes existentes con coordenadas absolutas a offsets relativos.
 */

import {
  toOffsetM,
  toLatLng,
  type GeoPosition,
  type OffsetM,
} from "./geo.ts"
import {
  INITIAL_WIZARD_STATE,
  sanitizeWizardState,
  type WizardState,
} from "./wizardMachine.ts"

export type RelativeItem = {
  id: string
  kind: "animal" | "human" | "natural" | "object" | "static-vehicle" | "vehicle"
  label: string
  rotation: number
  scale: number
  x: number // metros relativo al ancla
  y: number // metros relativo al ancla
}

export type RelativeVehicle = {
  rotation: number
  scale?: number
  x: number
  y: number
  type?: string
  model?: string
  direction?: string
  speed?: number
  trajectoryPoints?: Array<{ x: number; y: number }>
  postImpactOffset?: { x: number; y: number; rotation: number }
  impactZone?: string
}

export type RelativeEvidence = {
  label: string
  x: number
  y: number
}

export type ExpedienteState = {
  version: 2
  anchor: GeoPosition
  locationQuery: string
  vehicles: Record<string, RelativeVehicle>
  impact: OffsetM
  evidence: RelativeEvidence[]
  droppedItems: RelativeItem[]
  wizard?: WizardState
  impactVehicles?: string[]
  impactTime?: string
  savedAt: string
}

export const STORAGE_KEY_PREFIX = "cesvi_expediente_"
export const DEFAULT_CASE_ID = "EXP-0248"

export const DEFAULT_ANCHOR: GeoPosition = {
  lat: 19.4326,
  lng: -99.1332,
}

// Offsets estándar calculados a partir de las coordenadas históricas del Zócalo
export const DEFAULT_RELATIVE_VEHICLES: Record<string, RelativeVehicle> = {
  V1: { x: -36.757, y: 38.962, rotation: 38, scale: 1, type: "car", model: "Nissan Versa 2021", speed: 42, direction: "NE" },
  V2: { x: 36.757, y: -27.83, rotation: -61, scale: 1, type: "car", speed: 35, direction: "SO" },
}

export const DEFAULT_RELATIVE_IMPACT: OffsetM = {
  x: 12.602,
  y: 2.226,
}

export const DEFAULT_RELATIVE_EVIDENCE: RelativeEvidence[] = [
  { label: "E1", x: -26.255, y: 72.358 },
  { label: "E2", x: 57.761, y: -57.886 },
]

/**
 * Migra cualquier estructura de expediente (versión legacy con lat/lng absolutas o parcial)
 * al modelo relativo respecto al anchor.
 */
export function migrateLegacyCase(
  raw: any,
  fallbackAnchor: GeoPosition = DEFAULT_ANCHOR,
): ExpedienteState {
  if (!raw || typeof raw !== "object") {
    return {
      version: 2,
      anchor: { ...fallbackAnchor },
      locationQuery: "Plaza de la Constitución, Zócalo CDMX",
      vehicles: JSON.parse(JSON.stringify(DEFAULT_RELATIVE_VEHICLES)),
      impact: { ...DEFAULT_RELATIVE_IMPACT },
      evidence: JSON.parse(JSON.stringify(DEFAULT_RELATIVE_EVIDENCE)),
      droppedItems: [],
      savedAt: new Date().toISOString(),
    }
  }

  // Determinar el anchor (fuente única de verdad)
  let anchor: GeoPosition = { ...fallbackAnchor }
  if (raw.anchor && typeof raw.anchor.lat === "number" && typeof raw.anchor.lng === "number") {
    anchor = { lat: raw.anchor.lat, lng: raw.anchor.lng }
  } else if (Array.isArray(raw.center) && raw.center.length >= 2) {
    anchor = { lat: Number(raw.center[0]), lng: Number(raw.center[1]) }
  } else if (raw.mapCenter && Array.isArray(raw.mapCenter)) {
    anchor = { lat: Number(raw.mapCenter[0]), lng: Number(raw.mapCenter[1]) }
  }

  // Migrar vehículos
  const vehicles: Record<string, RelativeVehicle> = {}
  const rawVehicles = raw.vehicles || raw.mapVehicles

  if (rawVehicles && typeof rawVehicles === "object") {
    const keys = Object.keys(rawVehicles)
    for (const key of keys) {
      const v = rawVehicles[key]
      if (v) {
        let x = v.x
        let y = v.y
        if (
          (typeof x !== "number" || typeof y !== "number") &&
          typeof v.lat === "number" &&
          typeof v.lng === "number"
        ) {
          const offset = toOffsetM(anchor, { lat: v.lat, lng: v.lng })
          x = offset.x
          y = offset.y
        }
        const defaultV = DEFAULT_RELATIVE_VEHICLES[key]
        vehicles[key] = {
          x: typeof x === "number" && !isNaN(x) ? x : (defaultV?.x ?? 0),
          y: typeof y === "number" && !isNaN(y) ? y : (defaultV?.y ?? 0),
          rotation:
            typeof v.rotation === "number" ? v.rotation : (defaultV?.rotation ?? 0),
          scale: typeof v.scale === "number" ? v.scale : 1,
          type: v.type ?? defaultV?.type ?? "car",
          model: v.model ?? defaultV?.model,
          direction: v.direction ?? defaultV?.direction,
          speed: typeof v.speed === "number" ? v.speed : defaultV?.speed,
          trajectoryPoints: Array.isArray(v.trajectoryPoints) ? v.trajectoryPoints : undefined,
          postImpactOffset: v.postImpactOffset ?? undefined,
          impactZone: v.impactZone ?? undefined,
        }
      }
    }
  }

  // Si no hay vehículos en absoluto, inicializar con los defaults (V1 y V2)
  if (Object.keys(vehicles).length === 0) {
    vehicles.V1 = { ...DEFAULT_RELATIVE_VEHICLES.V1 }
    vehicles.V2 = { ...DEFAULT_RELATIVE_VEHICLES.V2 }
  }

  // Migrar impacto
  let impact: OffsetM = { ...DEFAULT_RELATIVE_IMPACT }
  const rawImpact = raw.impact || raw.impactPosition
  if (rawImpact) {
    let x = rawImpact.x
    let y = rawImpact.y
    if ((typeof x !== "number" || typeof y !== "number") && typeof rawImpact.lat === "number" && typeof rawImpact.lng === "number") {
      const offset = toOffsetM(anchor, { lat: rawImpact.lat, lng: rawImpact.lng })
      x = offset.x
      y = offset.y
    }
    if (typeof x === "number" && typeof y === "number" && !isNaN(x) && !isNaN(y)) {
      impact = { x, y }
    }
  }

  // Migrar evidencias
  const rawEvidence = raw.evidence || raw.evidencePositions
  let evidence: RelativeEvidence[] = JSON.parse(JSON.stringify(DEFAULT_RELATIVE_EVIDENCE))
  if (Array.isArray(rawEvidence) && rawEvidence.length > 0) {
    evidence = rawEvidence.map((e: any, idx: number) => {
      let x = e.x
      let y = e.y
      if ((typeof x !== "number" || typeof y !== "number") && typeof e.lat === "number" && typeof e.lng === "number") {
        const offset = toOffsetM(anchor, { lat: e.lat, lng: e.lng })
        x = offset.x
        y = offset.y
      }
      return {
        label: e.label || `E${idx + 1}`,
        x: typeof x === "number" && !isNaN(x) ? x : 0,
        y: typeof y === "number" && !isNaN(y) ? y : 0,
      }
    })
  }

  // Migrar droppedItems (objetos del catálogo, señalizaciones, mediciones)
  let droppedItems: RelativeItem[] = []
  if (Array.isArray(raw.droppedItems)) {
    droppedItems = raw.droppedItems.map((item: any, idx: number) => {
      let x = item.x
      let y = item.y
      if ((typeof x !== "number" || typeof y !== "number") && typeof item.lat === "number" && typeof item.lng === "number") {
        const offset = toOffsetM(anchor, { lat: item.lat, lng: item.lng })
        x = offset.x
        y = offset.y
      }
      return {
        id: item.id || `item-${Date.now()}-${idx}`,
        kind: item.kind || "object",
        label: item.label || "Elemento",
        rotation: typeof item.rotation === "number" ? item.rotation : 0,
        scale: typeof item.scale === "number" ? item.scale : 1,
        x: typeof x === "number" && !isNaN(x) ? x : 0,
        y: typeof y === "number" && !isNaN(y) ? y : 0,
      }
    })
  }

  const wizard = sanitizeWizardState(
    raw.wizard ?? {
      step: raw.step,
      unlockedSteps: raw.unlockedSteps,
      completedSteps: raw.completedSteps,
      isComplete: raw.isComplete,
    },
  )
  const impactVehicles = Array.isArray(raw.impactVehicles)
    ? raw.impactVehicles
    : ["V1", "V2"]
  const impactTime = typeof raw.impactTime === "string" ? raw.impactTime : "00:03.38"

  return {
    version: 2,
    anchor,
    locationQuery: typeof raw.locationQuery === "string" ? raw.locationQuery : "Ubicación del siniestro",
    vehicles,
    impact,
    evidence,
    droppedItems,
    wizard,
    impactVehicles,
    impactTime,
    savedAt: new Date().toISOString(),
  }
}

/**
 * Carga y migra el estado del expediente desde localStorage.
 */
export function loadSavedCase(caseId = DEFAULT_CASE_ID): ExpedienteState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${caseId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return migrateLegacyCase(parsed)
  } catch (err) {
    console.warn("No se pudo cargar el expediente desde localStorage:", err)
    return null
  }
}

/**
 * Guarda el expediente en localStorage.
 */
export function saveCase(state: ExpedienteState, caseId = DEFAULT_CASE_ID): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${caseId}`,
      JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
    )
  } catch (err) {
    console.warn("No se pudo guardar el expediente en localStorage:", err)
  }
}
