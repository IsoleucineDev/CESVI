export type GeoPosition = { lat: number; lng: number }

export type GeoVehicle = GeoPosition & {
  rotation: number
  scale?: number
}

export type DroppedItem = {
  id: string
  kind: "animal" | "human" | "natural" | "object" | "static-vehicle" | "vehicle"
  label: string
  rotation: number
  scale: number
  lat: number
  lng: number
}

export type LocationSuggestion = {
  display_name: string
  lat: string
  lon: string
}
