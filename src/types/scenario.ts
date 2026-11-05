import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet"
import type { IconName } from "../components/ui/Icon"

export type LocationSuggestion = {
  display_name: string
  lat: string
  lon: string
}

export type GeoPosition = { lat: number; lng: number }

export type GeoVehicle = GeoPosition & {
  rotation: number
  scale?: number
}

export type VehicleVariant =
  | "bicycle"
  | "bus"
  | "car"
  | "motorcycle"
  | "tractor"
  | "truck"
  | "van"

export type DroppedItem = {
  id: string
  kind: "animal" | "human" | "natural" | "object" | "static-vehicle" | "vehicle"
  label: string
  rotation: number
  scale: number
  lat: number
  lng: number
}

export type DragState = {
  type: "vehicle" | "dropped" | "impact" | "evidence"
  id: string
  mode: "move" | "rotate" | "scale"
  pointerOffset: { x: number; y: number }
  centerPoint: L.Point
  startRotation: number
  startScale: number
  initialDistance: number
}

export type MenuKey = "Objetos" | "Indicios" | "Vehículos"

export type OffsetM = { x: number; y: number }

export type RelativeVehicle = {
  rotation: number
  scale?: number
  x: number
  y: number
}

export type RelativeEvidence = {
  label: string
  x: number
  y: number
}

export const DEFAULT_MAP_CENTER: [number, number] = [19.4326, -99.1332]
export const DEFAULT_VEHICLE_OFFSETS: Record<"V1" | "V2", RelativeVehicle> = {
  V1: { x: -36.757, y: 38.962, rotation: 38, scale: 1 },
  V2: { x: 36.757, y: -27.83, rotation: -61, scale: 1 },
}
export const DEFAULT_IMPACT_OFFSET: OffsetM = {
  x: 12.602,
  y: 2.226,
}
export const DEFAULT_EVIDENCE_OFFSETS: RelativeEvidence[] = [
  { label: "E1", x: -26.255, y: 72.358 },
  { label: "E2", x: 57.761, y: -57.886 },
]

export const DEFAULT_VEHICLE_POSITIONS = {
  V1: { lat: 19.43295, lng: -99.13355, rotation: 38 },
  V2: { lat: 19.43235, lng: -99.13285, rotation: -61 },
}
export const IMPACT_POSITION: GeoPosition = { lat: 19.43262, lng: -99.13308 }
export const EVIDENCE_POSITIONS = [
  { lat: 19.43325, lng: -99.13345, label: "E1" },
  { lat: 19.43208, lng: -99.13265, label: "E2" },
]

export const frameNames = ["Inicio", "Aproximación", "Impacto", "Posición final"]
export const MAX_FRAMES = 30

export function getPixelsPerMeter(map: LeafletMap, position: LatLngExpression): number {
  const center = L.latLng(position)
  const next = L.latLng(center.lat + 0.0001, center.lng)
  const dMeters = map.distance(center, next)
  if (dMeters <= 0) return 1
  const pt1 = map.latLngToContainerPoint(center)
  const pt2 = map.latLngToContainerPoint(next)
  const dPixels = Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y)
  return Math.max(0.001, dPixels / dMeters)
}

export function getVehicleDimensions(variant: VehicleVariant = "car", scale = 1) {
  let lengthMeters = 4.5
  let widthMeters = 1.8

  switch (variant) {
    case "motorcycle":
    case "bicycle":
      lengthMeters = 2.2
      widthMeters = 0.8
      break
    case "truck":
    case "bus":
      lengthMeters = 9.5
      widthMeters = 2.5
      break
    case "van":
      lengthMeters = 5.2
      widthMeters = 2.0
      break
    case "tractor":
      lengthMeters = 4.0
      widthMeters = 2.2
      break
    default:
      lengthMeters = 4.5
      widthMeters = 1.8
      break
  }

  return {
    lengthMeters: lengthMeters * scale,
    widthMeters: widthMeters * scale,
  }
}

export function getVehicleVariant(label: string): VehicleVariant {
  const value = label.toLowerCase()
  if (value.includes("biciclet")) return "bicycle"
  if (
    value.includes("moto") ||
    value.includes("scooter") ||
    value.includes("ciclomotor") ||
    value.includes("enduro") ||
    value.includes("trial")
  )
    return "motorcycle"
  if (
    value.includes("autob") ||
    value.includes("autocar") ||
    value.includes("microb")
  )
    return "bus"
  if (
    value.includes("camión") ||
    value.includes("tractocam") ||
    value.includes("tráiler") ||
    value.includes("remolque") ||
    value.includes("tren de carretera")
  )
    return "truck"
  if (
    value.includes("tractor") ||
    value.includes("maquinaria")
  )
    return "tractor"
  if (
    value.includes("furgoneta") ||
    value.includes("camioneta") ||
    value.includes("pick-up") ||
    value.includes("monovolumen")
  )
    return "van"
  return "car"
}

export function getCatalogItemKind(menuKey: MenuKey, groupLabel: string): DroppedItem["kind"] {
  if (menuKey === "Vehículos") return "vehicle"
  if (groupLabel === "Vehículos estáticos") return "static-vehicle"
  if (groupLabel === "Cuerpos humanos") return "human"
  if (groupLabel === "Cuerpos animales") return "animal"
  if (groupLabel === "Naturales o desprendidos") return "natural"
  return "object"
}

export function getDroppedItemIcon(
  kind: DroppedItem["kind"],
  label = "",
): IconName {
  const value = label.toLowerCase()
  if (value.includes("neumático")) return "tire"
  if (value.includes("roca")) return "rock"
  if (kind === "vehicle" || kind === "static-vehicle") return "car"
  if (kind === "human") return "person"
  if (kind === "animal") return "sheep"
  if (kind === "natural") return "tree"
  return "warning"
}

export function getMaterialType(label: string, kind: DroppedItem["kind"]): string {
  const value = label.toLowerCase()
  if (value.includes("neumático")) return "rubber"
  if (
    value.includes("perfil") ||
    value.includes("barandilla") ||
    value.includes("poste") ||
    value.includes("pilar") ||
    value.includes("señal") ||
    kind === "vehicle" ||
    kind === "static-vehicle"
  )
    return "metal"
  if (
    value.includes("roca") ||
    value.includes("muro") ||
    value.includes("bordillo") ||
    value.includes("edificio")
  )
    return "stone"
  if (
    value.includes("árbol") ||
    value.includes("tronco") ||
    value.includes("viga")
  )
    return "wood"
  if (value.includes("cristal") || value.includes("parabrisas")) return "glass"
  if (kind === "human" || kind === "animal") return "organic"
  return "composite"
}

export const ribbonGroups: Record<
  string,
  { icon: IconName; label: string }[]
> = {
  Mapeo: [
    { icon: "map", label: "Mapa base" },
    { icon: "layers", label: "Trazado vial" },
    { icon: "plus", label: "Trayectoria" },
    { icon: "settings", label: "Medición" },
    { icon: "sign", label: "Señalización" },
  ],
  Vehículos: [
    { icon: "car", label: "Turismos" },
    { icon: "truck", label: "Carga" },
    { icon: "car", label: "Pasajeros" },
    { icon: "motorcycle", label: "Motocicletas" },
    { icon: "plus", label: "Otros" },
  ],
  Objetos: [
    { icon: "sign", label: "Infraestructura" },
    { icon: "warning", label: "Naturales" },
    { icon: "car", label: "Vehículos estáticos" },
    { icon: "person", label: "Cuerpos humanos" },
    { icon: "dog", label: "Animales" },
  ],
  Indicios: [
    { icon: "person", label: "Biológicos" },
    { icon: "car", label: "Huellas" },
    { icon: "warning", label: "Pavimento" },
    { icon: "layers", label: "Fragmentos" },
    { icon: "plus", label: "Fluidos" },
  ],
  Plantillas: [
    { icon: "map", label: "Intersección" },
    { icon: "warning", label: "Alcance" },
    { icon: "layers", label: "Cambio de carril" },
    { icon: "plus", label: "Nueva" },
  ],
}

export const catalogMenus: Record<
  MenuKey,
  {
    eyebrow: string
    title: string
    description: string
    sections: {
      title: string
      icon: IconName
      groups: { label: string; items: string[] }[]
    }[]
  }
> = {
  Objetos: {
    eyebrow: "ELEMENTOS DEL ESCENARIO",
    title: "Objetos",
    description: "Clasifica obstáculos, infraestructura y cuerpos presentes en la escena.",
    sections: [
      {
        title: "Duros o rígidos",
        icon: "warning",
        groups: [
          {
            label: "Infraestructura vial fija",
            items: [
              "Muros de protección",
              "Barandillas",
              "Vallas protectoras",
              "Señales de tráfico",
              "Postes",
              "Pilares",
              "Perfiles metálicos",
              "Hitos de arista",
              "Bordillos",
              "Edificios",
            ],
          },
          {
            label: "Naturales o desprendidos",
            items: ["Árboles", "Rocas", "Vigas", "Troncos", "Neumáticos"],
          },
          {
            label: "Vehículos estáticos",
            items: ["Estacionados", "Detenidos", "Abandonados"],
          },
        ],
      },
      {
        title: "Objetos o cuerpos blandos",
        icon: "person",
        groups: [
          {
            label: "Cuerpos humanos",
            items: ["Peatones", "Ciclistas", "Motociclistas", "Ocupantes"],
          },
          {
            label: "Cuerpos animales",
            items: ["Fauna silvestre", "Ganado"],
          },
        ],
      },
    ],
  },
  Indicios: {
    eyebrow: "RESTOS DEL ACCIDENTE",
    title: "Indicios",
    description: "Registra evidencias biológicas y físicas para el análisis pericial.",
    sections: [
      {
        title: "Indicios biológicos",
        icon: "person",
        groups: [
          {
            label: "Muestras",
            items: ["Sangre", "Tejidos", "Restos corporales"],
          },
        ],
      },
      {
        title: "Indicios físicos",
        icon: "layers",
        groups: [
          {
            label: "Huellas de neumáticos",
            items: ["Frenada", "Arrastre", "Derrape", "Aceleración", "Rodadura"],
          },
          {
            label: "Marcas en pavimento",
            items: ["Arañazos", "Restregones", "Hendiduras", "Hoyos"],
          },
          {
            label: "Fragmentos y autopartes",
            items: ["Plásticos", "Fibras", "Molduras", "Parachoques", "Piezas mecánicas"],
          },
          {
            label: "Restos de cristales",
            items: ["Laminados", "Templados", "Parabrisas", "Faros"],
          },
          {
            label: "Fluidos",
            items: ["Aceite", "Líquido de frenos", "Refrigerante", "Combustible"],
          },
        ],
      },
    ],
  },
  Vehículos: {
    eyebrow: "BIBLIOTECA DE VEHÍCULOS",
    title: "Tipos de vehículos",
    description: "Selecciona la categoría y configuración adecuada para la reconstrucción.",
    sections: [
      {
        title: "Turismos y ligeros",
        icon: "car",
        groups: [
          {
            label: "Carrocerías",
            items: [
              "Sedán / Berlina",
              "Coupé",
              "Cabrio / Convertible",
              "Familiar / Station Wagon",
              "Utilitario",
              "Monovolumen",
              "Todoterreno / 4x4",
              "SUV",
            ],
          },
        ],
      },
      {
        title: "Comerciales, industriales y carga",
        icon: "truck",
        groups: [
          {
            label: "Configuraciones",
            items: [
              "Furgonetas",
              "Camionetas / Pick-ups",
              "Camiones rígidos",
              "Tractocamiones / Tráilers",
              "Trenes de carretera",
              "Remolques y semirremolques",
            ],
          },
        ],
      },
      {
        title: "Transporte de pasajeros",
        icon: "car",
        groups: [
          {
            label: "Pasajeros",
            items: ["Microbuses", "Autobuses urbanos", "Autocares", "Autobuses articulados"],
          },
        ],
      },
      {
        title: "Motocicletas y ciclomotores",
        icon: "motorcycle",
        groups: [
          {
            label: "Carretera y campo",
            items: ["Turismo", "Sport", "Naked", "Custom", "Motocross", "Enduro", "Trial"],
          },
          {
            label: "Mixtas y urbanas",
            items: ["Trail", "Supermotard", "Scooter", "Ciclomotor"],
          },
        ],
      },
      {
        title: "Otros vehículos",
        icon: "plus",
        groups: [
          {
            label: "Especiales y no autopropulsados",
            items: [
              "Tractores",
              "Maquinaria de obras",
              "Maquinaria de servicios",
              "Bicicletas",
              "Carros de tracción animal",
            ],
          },
        ],
      },
    ],
  },
}
