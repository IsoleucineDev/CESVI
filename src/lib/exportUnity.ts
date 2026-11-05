import type { GeoPosition } from "./geo"

export type UnityExportMetadata = {
  version: string
  caseId: string
  timestamp: string
  fuente_cartografica: string
}

export type UnityExportData = {
  metadata: UnityExportMetadata
  anchor: GeoPosition
  locationQuery?: string
  vehicles: Record<string, unknown>
  impact?: GeoPosition | { x: number; y: number; lat?: number; lng?: number }
  evidence?: Array<{ label: string; lat: number; lng: number }>
  droppedItems?: Array<unknown>
}

export function buildUnityExport(data: {
  caseId?: string
  anchor: GeoPosition
  locationQuery?: string
  vehicles: Record<string, unknown>
  impact?: GeoPosition | { x: number; y: number; lat?: number; lng?: number }
  evidence?: Array<{ label: string; lat: number; lng: number }>
  droppedItems?: Array<unknown>
}): UnityExportData {
  return {
    metadata: {
      version: "2.0.0",
      caseId: data.caseId || "EXP-0248",
      timestamp: new Date().toISOString(),
      fuente_cartografica: "© OpenStreetMap contributors (https://www.openstreetmap.org/copyright)",
    },
    anchor: data.anchor,
    locationQuery: data.locationQuery,
    vehicles: data.vehicles,
    impact: data.impact,
    evidence: data.evidence,
    droppedItems: data.droppedItems,
  }
}

export function exportUnityJson(
  data: Parameters<typeof buildUnityExport>[0],
  filename = "EXP-0248-unity.json",
): UnityExportData {
  const exportData = buildUnityExport(data)
  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(jsonBlob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return exportData
}
