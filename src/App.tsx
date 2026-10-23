import { Fragment, useEffect, useRef, useState } from "react"
import { api, type CaseContext, type Scene } from "./lib/api"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

type LocationSuggestion = {
  display_name: string
  lat: string
  lon: string
}

const DEFAULT_MAP_CENTER: [number, number] = [19.4326, -99.1332]

function MapViewport({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.7 })
  }, [center, map])

  return null
}

type IconName = "arrow" | "car" | "chevron" | "clock" | "close" | "dashboard" | "delete" | "dog" | "download" | "layers" | "map" | "message" | "minus" | "more" | "motorcycle" | "pause" | "person" | "play" | "plus" | "redo" | "rock" | "search" | "send" | "settings" | "sheep" | "sign" | "sparkle" | "tire" | "tree" | "truck" | "undo" | "warning"

const iconPaths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  car: (
    <>
      <path d="m5 17-1 2v1h2l1-2h10l1 2h2v-1l-1-2" />
      <path d="M3 13h18v4H3zM5 13l2-6h10l2 6M7 15h.01M17 15h.01" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m7 7 10 10M17 7 7 17" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  delete: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  dog: (
    <>
      <path d="M7 9 4 5v7l2 2v5h4v-4h4v4h4v-6l2-2V5l-4 4H7Z" />
      <path d="M9 6.5 12 4l3 2.5M9 11h.01M15 11h.01M11 13h2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  message: (
    <>
      <path d="M4 5h16v12H8l-4 4V5Z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="6" cy="16" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path d="m6 16 4-7 4 7h4l-3-6h3M9 9h4" />
    </>
  ),
  pause: (
    <>
      <path d="M9 7v10M15 7v10" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v7M8 12l4-3 4 3M9 21l3-6 3 6" />
    </>
  ),
  play: <path d="m9 7 9 5-9 5V7Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  redo: <path d="M20 8h-7a6 6 0 0 0-6 6v2m13-8-3-3m3 3-3 3" />,
  rock: <path d="m4 18 2-8 5-5 6 2 3 7-3 5H7l-3-1Zm4-7 4 2 4-4M12 13l-2 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  send: <path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.8 7L6.5 6l-2 3.4 2 1.5a7 7 0 0 0 0 2L4.5 14l2 3.5 2.3-1A7 7 0 0 0 10.4 18l.3 2.5h4L15 18a7 7 0 0 0 1.6-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z" />
    </>
  ),
  sheep: (
    <>
      <path d="M7.2 8.4a3 3 0 0 1 5.1-2 3.2 3.2 0 0 1 5 2.6 3 3 0 0 1-.8 5.8H8a3.3 3.3 0 0 1-.8-6.4Z" />
      <path d="M17 10.5h2.3a2 2 0 0 1 0 4H17M8 15v4M15 15v4M18.8 10.5l1.2-1.3M20.5 12h.01" />
    </>
  ),
  sign: (
    <>
      <path d="M12 22V9M7 3h10l2 3-2 3H7L5 6l2-3Z" />
    </>
  ),
  sparkle: (
    <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />
  ),
  tire: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m8 5 2 3M14 5l-1 3M18 8l-3 2M19 14l-4-1M15 19l-2-4M9 19l1-4M5 15l4-2M5 9l4 1" />
    </>
  ),
  tree: (
    <>
      <path d="M12 3 7.5 9h2L6 14h4v6h4v-6h4l-3.5-5h2L12 3Z" />
      <path d="M9 21h6" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  undo: <path d="M4 8h7a6 6 0 0 1 6 6v2M4 8l3-3M4 8l3 3" />,
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  )
}

type VehicleVariant =
  | "bicycle"
  | "bus"
  | "car"
  | "motorcycle"
  | "tractor"
  | "truck"
  | "van"

function VehicleSprite({
  parked = false,
  variant = "car",
}: {
  parked?: boolean
  variant?: VehicleVariant
}) {
  if (variant === "motorcycle" || variant === "bicycle") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-${variant}`}
        viewBox="0 0 48 80"
      >
        <circle className="vehicle-tire" cx="24" cy="10" r="7" />
        <circle className="vehicle-tire" cx="24" cy="70" r="7" />
        <path
          className="vehicle-detail"
          d={
            variant === "bicycle"
              ? "M24 17v17m0 0-10 15h20L24 34Zm0 15v14M15 31h18"
              : "M24 17v13l-7 15h14l-7-15m0 15v18M17 26h14"
          }
        />
        {variant === "motorcycle" && (
          <path className="vehicle-body" d="M17 30h14l4 18-11 9-11-9 4-18Z" />
        )}
      </svg>
    )
  }

  if (variant === "truck" || variant === "bus" || variant === "van") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-${variant} ${
          parked ? "is-parked" : ""
        }`}
        viewBox="0 0 48 80"
      >
        <path
          className="vehicle-tire"
          d="M2 14h5v15H2zM41 14h5v15h-5zM2 52h5v15H2zM41 52h5v15h-5z"
        />
        <rect
          className="vehicle-body"
          height={variant === "truck" ? 48 : 72}
          rx="7"
          width="34"
          x="7"
          y={variant === "truck" ? 29 : 4}
        />
        {variant === "truck" && (
          <path className="vehicle-body" d="M10 4h28l3 22H7l3-22Z" />
        )}
        <path className="vehicle-glass" d="M11 9h26l2 12H9l2-12Z" />
        <path
          className="vehicle-detail"
          d={
            variant === "bus"
              ? "M11 28h26M11 39h26M11 50h26M11 61h26"
              : "M10 29h28M10 59h28"
          }
        />
        <path className="vehicle-light" d="M10 7h7M31 7h7M10 72h7M31 72h7" />
      </svg>
    )
  }

  if (variant === "tractor") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-tractor ${
          parked ? "is-parked" : ""
        }`}
        viewBox="0 0 48 80"
      >
        <circle className="vehicle-tire" cx="10" cy="54" r="9" />
        <circle className="vehicle-tire" cx="38" cy="54" r="9" />
        <circle className="vehicle-tire" cx="13" cy="16" r="6" />
        <circle className="vehicle-tire" cx="35" cy="16" r="6" />
        <path className="vehicle-body" d="M14 9h20l4 49H10l4-49Z" />
        <path className="vehicle-glass" d="M15 29h18l3 17H12l3-17Z" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={`vehicle-sprite vehicle-${variant} ${
        parked ? "is-parked" : ""
      }`}
      viewBox="0 0 48 80"
    >
      <path
        className="vehicle-tire"
        d="M3 18h5v14H3zM40 18h5v14h-5zM3 49h5v14H3zM40 49h5v14h-5z"
      />
      <path
        className="vehicle-body"
        d="M14 3h20l7 13 2 43-7 17H12L5 59l2-43 7-13Z"
      />
      <path
        className="vehicle-glass"
        d="m14 10-4 14h28l-4-14H14ZM10 50l3 17h22l3-17H10Z"
      />
      <path className="vehicle-roof" d="M12 28h24l2 18H10l2-18Z" />
      <path className="vehicle-detail" d="M9 19h30M10 58h28M24 28v18" />
      <path className="vehicle-light" d="M9 8h6M33 8h6M8 68h7M33 68h7" />
    </svg>
  )
}

function getVehicleVariant(label: string): VehicleVariant {
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

function Button({
  ariaControls,
  ariaExpanded,
  children,
  className = "",
  disabled,
  draggable,
  onDragStart,
  onClick,
  onPointerDown,
  style,
  title,
}: {
  ariaControls?: string
  ariaExpanded?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void
  onClick?: () => void
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  style?: React.CSSProperties
  title?: string
}) {
  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      className={`button ${className}`}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

function ToolButton({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: IconName
  label: string
  onClick?: () => void
}) {
  return (
    <Button
      className={`tool-button ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="tool-icon">
        <Icon name={icon} size={21} />
      </span>
      <span>{label}</span>
    </Button>
  )
}

const ribbonGroups = {
  Mapeo: [
    { icon: "map" as IconName, label: "Mapa base" },
    { icon: "layers" as IconName, label: "Trazado vial" },
    { icon: "plus" as IconName, label: "Trayectoria" },
    { icon: "settings" as IconName, label: "Medición" },
    { icon: "sign" as IconName, label: "Señalización" },
  ],
  Vehículos: [
    { icon: "car" as IconName, label: "Turismos" },
    { icon: "truck" as IconName, label: "Carga" },
    { icon: "car" as IconName, label: "Pasajeros" },
    { icon: "motorcycle" as IconName, label: "Motocicletas" },
    { icon: "plus" as IconName, label: "Otros" },
  ],
  Objetos: [
    { icon: "sign" as IconName, label: "Infraestructura" },
    { icon: "warning" as IconName, label: "Naturales" },
    { icon: "car" as IconName, label: "Vehículos estáticos" },
    { icon: "person" as IconName, label: "Cuerpos humanos" },
    { icon: "dog" as IconName, label: "Animales" },
  ],
  Indicios: [
    { icon: "person" as IconName, label: "Biológicos" },
    { icon: "car" as IconName, label: "Huellas" },
    { icon: "warning" as IconName, label: "Pavimento" },
    { icon: "layers" as IconName, label: "Fragmentos" },
    { icon: "plus" as IconName, label: "Fluidos" },
  ],
  Plantillas: [
    { icon: "map" as IconName, label: "Intersección" },
    { icon: "warning" as IconName, label: "Alcance" },
    { icon: "layers" as IconName, label: "Cambio de carril" },
    { icon: "plus" as IconName, label: "Nueva" },
  ],
}

type MenuKey = "Objetos" | "Indicios" | "Vehículos"

const catalogMenus: Record<MenuKey, {
  eyebrow: string
  title: string
  description: string
  sections: {
    title: string
    icon: IconName
    groups: { label: string; items: string[] }[]
  }[]
}> = {
  Objetos: {
    eyebrow: "ELEMENTOS DEL ESCENARIO",
    title: "Objetos",
    description:
      "Clasifica obstáculos, infraestructura y cuerpos presentes en la escena.",
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
    description:
      "Registra evidencias biológicas y físicas para el análisis pericial.",
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
            items: [
              "Frenada",
              "Arrastre",
              "Derrape",
              "Aceleración",
              "Rodadura",
            ],
          },
          {
            label: "Marcas en pavimento",
            items: ["Arañazos", "Restregones", "Hendiduras", "Hoyos"],
          },
          {
            label: "Fragmentos y autopartes",
            items: [
              "Plásticos",
              "Fibras",
              "Molduras",
              "Parachoques",
              "Piezas mecánicas",
            ],
          },
          {
            label: "Restos de cristales",
            items: ["Laminados", "Templados", "Parabrisas", "Faros"],
          },
          {
            label: "Fluidos",
            items: [
              "Aceite",
              "Líquido de frenos",
              "Refrigerante",
              "Combustible",
            ],
          },
        ],
      },
    ],
  },
  Vehículos: {
    eyebrow: "BIBLIOTECA DE VEHÍCULOS",
    title: "Tipos de vehículos",
    description:
      "Selecciona la categoría y configuración adecuada para la reconstrucción.",
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
            items: [
              "Microbuses",
              "Autobuses urbanos",
              "Autocares",
              "Autobuses articulados",
            ],
          },
        ],
      },
      {
        title: "Motocicletas y ciclomotores",
        icon: "motorcycle",
        groups: [
          {
            label: "Carretera y campo",
            items: [
              "Turismo",
              "Sport",
              "Naked",
              "Custom",
              "Motocross",
              "Enduro",
              "Trial",
            ],
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

const frameNames = ["Inicio", "Aproximación", "Impacto", "Posición final"]
const MAX_FRAMES = 30

type DroppedItem = {
  id: string
  kind: "animal" | "human" | "natural" | "object" | "static-vehicle" | "vehicle"
  label: string
  rotation: number
  scale: number
  x: number
  y: number
}

type ActiveElementDrag = {
  id: string
  mode: "move" | "rotate" | "scale"
  startDistance?: number
  startScale?: number
  type: "dropped" | "vehicle"
}

function getCatalogItemKind(menuKey: MenuKey, groupLabel: string) {
  if (menuKey === "Vehículos") return "vehicle" as const
  if (groupLabel === "Vehículos estáticos") return "static-vehicle" as const
  if (groupLabel === "Cuerpos humanos") return "human" as const
  if (groupLabel === "Cuerpos animales") return "animal" as const
  if (groupLabel === "Naturales o desprendidos") return "natural" as const
  return "object" as const
}

function getDroppedItemIcon(
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

function getMaterialType(label: string, kind: DroppedItem["kind"]) {
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

function CatalogItemVisual({
  kind,
  label,
}: {
  kind: DroppedItem["kind"]
  label: string
}) {
  if (kind === "vehicle" || kind === "static-vehicle") {
    return (
      <span
        className={`catalog-item-visual catalog-vehicle-visual material-${getMaterialType(
          label,
          kind,
        )}`}
      >
        <VehicleSprite
          parked={kind === "static-vehicle"}
          variant={getVehicleVariant(label)}
        />
      </span>
    )
  }

  return (
    <span
      className={`catalog-item-visual catalog-${kind}-visual material-${getMaterialType(
        label,
        kind,
      )} ${
        kind === "animal" ? "catalog-animal-stamp" : ""
      }`}
    >
      <Icon name={getDroppedItemIcon(kind, label)} size={13} />
    </span>
  )
}

function CatalogMenu({
  menuKey,
  onClose,
  onSelect,
}: {
  menuKey: MenuKey
  onClose: () => void
  onSelect: (
    item: string,
    kind: DroppedItem["kind"],
    placeOnMap: boolean,
  ) => void
}) {
  const menu = catalogMenus[menuKey]

  return (
    <div className="catalog-menu" id="catalog-menu">
      <div className="catalog-menu-head">
        <div>
          <span className="eyebrow">{menu.eyebrow}</span>
          <div className="catalog-title">{menu.title}</div>
          <p>{menu.description}</p>
        </div>
        <Button className="icon-button" onClick={onClose} title="Cerrar menú">
          <Icon name="close" size={17} />
        </Button>
      </div>
      <div
        className={`catalog-sections catalog-sections-${menu.sections.length}`}
      >
        {menu.sections.map((section) => (
          <div className="catalog-section" key={section.title}>
            <div className="catalog-section-title">
              <span>
                <Icon name={section.icon} size={17} />
              </span>
              <b>{section.title}</b>
            </div>
            {section.groups.map((group) => (
              <div className="catalog-group" key={group.label}>
                <span>{group.label}</span>
                <div className="catalog-items">
                  {group.items.map((item) => (
                    <Button
                      className={`catalog-item ${
                        menuKey !== "Indicios" ? "is-draggable" : ""
                      }`}
                      draggable={menuKey !== "Indicios"}
                      key={item}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy"
                        event.dataTransfer.setData(
                          "application/x-cesvi-item",
                          JSON.stringify({
                            label: item,
                            kind: getCatalogItemKind(menuKey, group.label),
                          }),
                        )
                      }}
                      onClick={() =>
                        onSelect(
                          item,
                          getCatalogItemKind(menuKey, group.label),
                          menuKey !== "Indicios",
                        )
                      }
                      title={
                        menuKey !== "Indicios"
                          ? "Arrastrar al mapa"
                          : "Seleccionar indicio"
                      }
                    >
                      {menuKey !== "Indicios" && (
                        <CatalogItemVisual
                          kind={getCatalogItemKind(menuKey, group.label)}
                          label={item}
                        />
                      )}
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({
  onClose,
  onNewCase,
}: {
  onClose: () => void
  onNewCase: () => void
}) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">CENTRO DE CASOS</div>
          <div className="dashboard-title">Expedientes recientes</div>
        </div>
        <Button className="icon-button" onClick={onClose} title="Cerrar">
          <Icon name="close" />
        </Button>
      </div>
      <div className="dashboard-metrics">
        <div className="metric">
          <span>Casos activos</span>
          <strong>12</strong>
          <small>3 requieren revisión</small>
        </div>
        <div className="metric">
          <span>Reconstrucciones</span>
          <strong>28</strong>
          <small>Durante este mes</small>
        </div>
        <div className="metric">
          <span>Tiempo promedio</span>
          <strong>4.2 h</strong>
          <small>−18% vs. mes anterior</small>
        </div>
      </div>
      <div className="case-list">
        {[
          [
            "EXP-0248",
            "Colisión en Av. Reforma",
            "Editado hace 12 min",
            "En curso",
          ],
          ["EXP-0245", "Alcance en Insurgentes Sur", "Ayer, 18:42", "Revisión"],
          [
            "EXP-0239",
            "Cruce de Calz. de Tlalpan",
            "12 jun, 10:16",
            "Completado",
          ],
        ].map(([id, name, date, status]) => (
          <Button className="case-row" key={id} onClick={onClose}>
            <span className="case-icon">
              <Icon name="map" />
            </span>
            <span className="case-main">
              <b>{name}</b>
              <small>
                {id} · {date}
              </small>
            </span>
            <span
              className={`status status-${status.toLowerCase().replace("ó", "o")}`}
            >
              {status}
            </span>
            <Icon name="arrow" />
          </Button>
        ))}
      </div>
      <Button className="primary-button" onClick={onNewCase}>
        <Icon name="plus" />
        Nuevo expediente
      </Button>
    </div>
  )
}

function App() {
  const [ribbon, setRibbon] = useState<keyof typeof ribbonGroups>("Mapeo")
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [selectedTool, setSelectedTool] = useState("Mapa base")
  const [selectedFrame, setSelectedFrame] = useState(2)
  const [frames, setFrames] = useState(frameNames)
  const [sceneRecords, setSceneRecords] = useState<Scene[]>([])
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [chatText, setChatText] = useState("")
  const [messages, setMessages] = useState<string[]>([])
  const [zoom, setZoom] = useState(72)
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([])
  const [selectedDroppedId, setSelectedDroppedId] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mapMode, setMapMode] = useState<"select" | "pan" | "measure">("select")
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastRemovedItem, setLastRemovedItem] = useState<DroppedItem | null>(
    null,
  )
  const [mapTheme, setMapTheme] = useState<"base" | "technical">("base")
  const [assistantOptionsOpen, setAssistantOptionsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [activeElementDrag, setActiveElementDrag] =
    useState<ActiveElementDrag | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState("V1")
  const [mapVehicles, setMapVehicles] = useState({
    V1: { rotation: 38, scale: 1, x: 43, y: 43 },
    V2: { rotation: -61, scale: 1, x: 51, y: 49 },
  })
  const [smartGuides, setSmartGuides] = useState<{
    x: number | null
    y: number | null
  }>({ x: null, y: null })
  const [locationQuery, setLocationQuery] = useState("Av. Paseo de la Reforma 222")
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const panOrigin = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const locationQueryInitialized = useRef(false)
  const activeTools = ribbonGroups[ribbon]

  useEffect(() => {
    if (!locationQueryInitialized.current) {
      locationQueryInitialized.current = true
      return
    }
    const query = locationQuery.trim()
    if (query.length < 3) {
      setLocationSuggestions([])
      setLocationSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLocationSearchLoading(true)
      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "5",
          "accept-language": "es",
        })
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        )
        if (!response.ok) throw new Error("No se pudieron buscar ubicaciones")
        const results = (await response.json()) as LocationSuggestion[]
        setLocationSuggestions(results)
        setLocationMenuOpen(true)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLocationSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLocationSearchLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [locationQuery])

  useEffect(() => {
    let active = true
    setDataLoading(true)
    Promise.allSettled([api.getCase(), api.getScenes()])
      .then(([caseResult, scenesResult]) => {
        if (!active) return
        if (caseResult.status === "fulfilled") setCaseContext(caseResult.value)
        if (scenesResult.status === "fulfilled" && scenesResult.value.length > 0) {
          const ordered = [...scenesResult.value].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          )
          setSceneRecords(ordered)
          setFrames(ordered.map((scene) => scene.name))
          setSelectedFrame((current) => Math.min(current, ordered.length - 1))
        }
        const failed = [caseResult, scenesResult].find(
          (result) => result.status === "rejected",
        )
        setDataError(
          failed?.status === "rejected"
            ? failed.reason instanceof Error
              ? failed.reason.message
              : "No se pudo cargar el expediente"
            : null,
        )
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(""), 2200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    const navigateTimeline = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.matches("input, textarea, select") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setPlaying(false)
        setSelectedFrame((current) => Math.max(0, current - 1))
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setPlaying(false)
        setSelectedFrame((current) =>
          Math.min(frames.length - 1, current + 1),
        )
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedDroppedId
      ) {
        event.preventDefault()
        setDroppedItems((current) => {
          setLastRemovedItem(
            current.find((item) => item.id === selectedDroppedId) ?? null,
          )
          return current.filter((item) => item.id !== selectedDroppedId)
        })
        setSelectedDroppedId(null)
        setFeedback("Elemento eliminado · Puedes usar Rehacer")
      }
    }

    window.addEventListener("keydown", navigateTimeline)
    return () => window.removeEventListener("keydown", navigateTimeline)
  }, [frames.length, selectedDroppedId])

  useEffect(() => {
    if (!playing) return

    const timer = window.setInterval(() => {
      setSelectedFrame((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 900)

    return () => window.clearInterval(timer)
  }, [playing, frames.length])

  const selectRibbon = (tab: string) => {
    if (!(tab in ribbonGroups)) {
      setOpenMenu(null)
      if (tab === "Archivo") {
        setShowDashboard(true)
      }
      if (tab === "Vista") {
        setZoom(72)
        setPan({ x: 0, y: 0 })
        setFeedback("Vista del mapa restablecida")
      }
      return
    }

    const nextRibbon = tab as keyof typeof ribbonGroups
    setRibbon(nextRibbon)
    setSelectedTool(ribbonGroups[nextRibbon][0].label)
    setOpenMenu(
      tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
        ? openMenu === tab
          ? null
          : tab
        : null,
    )
  }

  const selectCatalogItem = (
    item: string,
    kind: DroppedItem["kind"],
    placeOnMap: boolean,
  ) => {
    setSelectedTool(item)
    setOpenMenu(null)
    if (!placeOnMap) {
      setFeedback(`${item} seleccionado`)
      return
    }

    const id = `${Date.now()}-${droppedItems.length}`
    const offset = (droppedItems.length % 5) * 2
    setDroppedItems((current) => [
      ...current,
      {
        id,
        kind,
        label: item,
        rotation: 0,
        scale: 1,
        x: 47 + offset,
        y: 44 + offset,
      },
    ])
    setSelectedDroppedId(id)
    setSelectedVehicleId("")
    setLastRemovedItem(null)
    setFeedback(`${item} agregado al mapa · Arrastra para moverlo`)
  }

  const getMapPosition = (
    clientX: number,
    clientY: number,
    bounds: DOMRect,
  ) => {
    const scale = zoom / 72
    const screenX = clientX - bounds.left
    const screenY = clientY - bounds.top
    const worldX = (screenX - pan.x - bounds.width / 2) / scale + bounds.width / 2
    const worldY =
      (screenY - pan.y - bounds.height / 2) / scale + bounds.height / 2

    return {
      x: Math.min(500, Math.max(-400, (worldX / bounds.width) * 100)),
      y: Math.min(500, Math.max(-400, (worldY / bounds.height) * 100)),
    }
  }

  const dropCatalogItem = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const payload = event.dataTransfer.getData("application/x-cesvi-item")
    const movedItemId = event.dataTransfer.getData(
      "application/x-cesvi-map-item",
    )
    if (!payload && !movedItemId) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const { x, y } = getMapPosition(event.clientX, event.clientY, bounds)

    if (movedItemId) {
      setDroppedItems((current) =>
        current.map((item) =>
          item.id === movedItemId ? { ...item, x, y } : item,
        ),
      )
      setSelectedDroppedId(movedItemId)
      return
    }

    const item = JSON.parse(payload) as Pick<DroppedItem, "kind" | "label">
    const id = `${Date.now()}-${droppedItems.length}`
    setDroppedItems((current) => [
      ...current,
      {
        ...item,
        id,
        rotation: 0,
        scale: 1,
        x,
        y,
      },
    ])
    setSelectedDroppedId(id)
    setLastRemovedItem(null)
    setSelectedTool(item.label)
    setOpenMenu(null)
  }

  const moveMapElement = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeElementDrag) return
    let { x, y } = getMapPosition(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    )

    if (activeElementDrag.mode === "move") {
      const xCandidates = [
        50,
        mapVehicles.V1.x,
        mapVehicles.V2.x,
        ...droppedItems
          .filter((item) => item.id !== activeElementDrag.id)
          .map((item) => item.x),
      ]
      const yCandidates = [
        50,
        mapVehicles.V1.y,
        mapVehicles.V2.y,
        ...droppedItems
          .filter((item) => item.id !== activeElementDrag.id)
          .map((item) => item.y),
      ]
      const snapX = xCandidates.find((candidate) => Math.abs(candidate - x) < 1)
      const snapY = yCandidates.find((candidate) => Math.abs(candidate - y) < 1)
      if (snapX !== undefined) x = snapX
      if (snapY !== undefined) y = snapY
      setSmartGuides({
        x: snapX ?? null,
        y: snapY ?? null,
      })
    } else {
      setSmartGuides({ x: null, y: null })
    }

    if (activeElementDrag.type === "vehicle") {
      if (activeElementDrag.mode !== "move") {
        setMapVehicles((current) => {
          const vehicle = current[activeElementDrag.id as "V1" | "V2"]
          return {
            ...current,
            [activeElementDrag.id]: {
              ...vehicle,
              ...(activeElementDrag.mode === "rotate"
                ? {
                    rotation:
                      (Math.atan2(y - vehicle.y, x - vehicle.x) * 180) /
                        Math.PI +
                      90,
                  }
                : {
                    scale: Math.min(
                      3,
                      Math.max(
                        0.45,
                        (activeElementDrag.startScale ?? 1) *
                          (Math.hypot(x - vehicle.x, y - vehicle.y) /
                            (activeElementDrag.startDistance ?? 1)),
                      ),
                    ),
                  }),
            },
          }
        })
        return
      }
      setMapVehicles((current) => ({
        ...current,
        [activeElementDrag.id]: {
          ...current[activeElementDrag.id as "V1" | "V2"],
          x,
          y,
        },
      }))
      return
    }

    setDroppedItems((current) =>
      current.map((item) =>
        item.id === activeElementDrag.id
          ? activeElementDrag.mode === "rotate"
            ? {
                ...item,
                rotation:
                  (Math.atan2(y - item.y, x - item.x) * 180) / Math.PI + 90,
              }
            : activeElementDrag.mode === "scale"
              ? {
                  ...item,
                  scale: Math.min(
                    3,
                    Math.max(
                      0.45,
                      (activeElementDrag.startScale ?? 1) *
                        (Math.hypot(x - item.x, y - item.y) /
                          (activeElementDrag.startDistance ?? 1)),
                    ),
                  ),
                }
              : { ...item, x, y }
          : item,
      ),
    )
  }

  const beginElementDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    drag: ActiveElementDrag,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveElementDrag(drag)
    if (drag.type === "vehicle") {
      setSelectedVehicleId(drag.id)
      setSelectedDroppedId(null)
    } else {
      setSelectedDroppedId(drag.id)
      setSelectedVehicleId("")
    }
  }

  const beginElementRotation = (
    event: React.PointerEvent<HTMLButtonElement>,
    type: ActiveElementDrag["type"],
    id: string,
  ) => {
    beginElementDrag(event, { id, mode: "rotate", type })
  }

  const beginElementScale = (
    event: React.PointerEvent<HTMLButtonElement>,
    type: ActiveElementDrag["type"],
    id: string,
  ) => {
    const mapCanvas = event.currentTarget.closest(".map-canvas")
    if (!mapCanvas) return
    const pointer = getMapPosition(
      event.clientX,
      event.clientY,
      mapCanvas.getBoundingClientRect(),
    )
    const element =
      type === "vehicle"
        ? mapVehicles[id as "V1" | "V2"]
        : droppedItems.find((item) => item.id === id)
    if (!element) return
    beginElementDrag(event, {
      id,
      mode: "scale",
      startDistance: Math.max(
        0.1,
        Math.hypot(pointer.x - element.x, pointer.y - element.y),
      ),
      startScale: element.scale,
      type,
    })
  }

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapMode !== "pan" && event.button !== 1) return
    if (
      (event.target as HTMLElement).closest(
        ".map-toolbar, .zoom-controls, .object-inspector, .inspector-reopen",
      )
    )
      return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    panOrigin.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: pan.x,
      y: pan.y,
    }
    setIsPanning(true)
  }

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return
    setPan({
      x: panOrigin.current.x + event.clientX - panOrigin.current.clientX,
      y: panOrigin.current.y + event.clientY - panOrigin.current.clientY,
    })
  }

  const stopPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    setIsPanning(false)
  }

  const changeZoom = (delta: number) => {
    setZoom((value) => Math.min(144, Math.max(32, value + delta)))
  }

  const undoLastObject = () => {
    setDroppedItems((current) => {
      const removed = current.at(-1)
      if (!removed) {
        setFeedback("No hay acciones para deshacer")
        return current
      }
      setLastRemovedItem(removed)
      setSelectedDroppedId(null)
      setFeedback(`${removed.label} retirado del mapa`)
      return current.slice(0, -1)
    })
  }

  const redoLastObject = () => {
    if (!lastRemovedItem) {
      setFeedback("No hay acciones para rehacer")
      return
    }
    setDroppedItems((current) => [...current, lastRemovedItem])
    setSelectedDroppedId(lastRemovedItem.id)
    setFeedback(`${lastRemovedItem.label} restaurado`)
    setLastRemovedItem(null)
  }

  const exportReport = () => {
    const report = [
      "CESVI · Reconstrucción vial",
      "Expediente: EXP-0248",
      `Escenas: ${frames.length}`,
      `Elementos colocados: ${droppedItems.length}`,
      ...droppedItems.map((item) => `- ${item.label} (${item.kind})`),
    ].join("\n")
    const url = URL.createObjectURL(
      new Blob([report], { type: "text/plain;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "EXP-0248-informe.txt"
    link.click()
    URL.revokeObjectURL(url)
    setFeedback("Informe exportado")
  }

  const createNewCase = () => {
    setDroppedItems([])
    setFrames(frameNames)
    setSelectedFrame(0)
    setSelectedDroppedId(null)
    setShowDashboard(false)
    setFeedback("Nuevo expediente preparado")
  }

  const addFrame = () => {
    if (frames.length >= MAX_FRAMES) return
    const nextSceneNumber =
      Math.max(
        frames.length,
        ...frames.map((frame) => {
          const match = frame.match(/^Escena (\d+)$/)
          return match ? Number(match[1]) : 0
        }),
      ) + 1
    setFrames((current) => [...current, `Escena ${nextSceneNumber}`])
    setSelectedFrame(frames.length)
  }

  const sendMessage = async () => {
    if (!chatText.trim() || assistantLoading) return
    const message = chatText.trim()
    setChatText("")
    setMessages((current) => [...current, message, ""])
    setAssistantLoading(true)
    try {
      await api.sendAssistantMessage(
        message,
        {
          case: caseContext,
          scene: frames[selectedFrame],
          selectedTool,
          selectedFrame,
          droppedItems,
          vehicles: mapVehicles,
        },
        (token) => {
          setMessages((current) => {
            const next = [...current]
            next[next.length - 1] = `${next[next.length - 1]}${token}`
            return next
          })
        },
      )
    } catch (error: unknown) {
      setMessages((current) => current.slice(0, -1))
      setDataError(error instanceof Error ? error.message : "No se pudo contactar al asistente")
    } finally {
      setAssistantLoading(false)
    }
  }

  return (
    <main className="app-shell" aria-busy={dataLoading || assistantLoading}>
      <header className="titlebar">
        <div className="brand-area">
          <Button
            className="app-launcher"
            onClick={() => setShowDashboard(true)}
            title="Abrir centro de casos"
          >
            <Icon name="dashboard" size={20} />
          </Button>
          <div className="brand-mark">
            <span />
          </div>
          <div className="document-name">
            <b>CESVI · Reconstrucción vial</b>
            <span>EXP-0248 · Guardado</span>
          </div>
        </div>
        <nav className="ribbon-tabs" aria-label="Herramientas principales">
          {[
            "Archivo",
            "Mapeo",
            "Objetos",
            "Indicios",
            "Vehículos",
            "Plantillas",
            "Vista",
          ].map((tab) => (
            <Button
              ariaControls={
                tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
                  ? "catalog-menu"
                  : undefined
              }
              ariaExpanded={
                tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
                  ? openMenu === tab
                  : undefined
              }
              className={ribbon === tab ? "tab-active" : ""}
              key={tab}
              onClick={() => selectRibbon(tab)}
            >
              {tab === "Vehículos" ? "Tipos de vehículos" : tab}
              {(tab === "Objetos" ||
                tab === "Indicios" ||
                tab === "Vehículos") && <Icon name="chevron" size={12} />}
            </Button>
          ))}
        </nav>
        <div className="title-actions">
          <Button
            className="icon-button"
            onClick={undoLastObject}
            title="Deshacer último elemento"
          >
            <Icon name="undo" />
          </Button>
          <Button
            className="icon-button"
            onClick={redoLastObject}
            title="Rehacer último elemento"
          >
            <Icon name="redo" />
          </Button>
          <span className="divider" />
          <Button className="share-button" onClick={exportReport}>
            <Icon name="download" />
            Exportar informe
          </Button>
          <div className="avatar">LM</div>
        </div>
        {openMenu && (
          <CatalogMenu
            menuKey={openMenu}
            onClose={() => setOpenMenu(null)}
            onSelect={selectCatalogItem}
          />
        )}
      </header>

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
                setLocationQuery(event.target.value)
                setLocationMenuOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const firstSuggestion = locationSuggestions[0]
                  if (firstSuggestion) {
                    setLocationQuery(firstSuggestion.display_name)
                    setMapCenter([Number(firstSuggestion.lat), Number(firstSuggestion.lon)])
                    setLocationSuggestions([])
                    setLocationMenuOpen(false)
                  } else {
                    setFeedback(`Ubicación buscada: ${event.currentTarget.value}`)
                  }
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
                    setLocationQuery(suggestion.display_name)
                    setMapCenter([Number(suggestion.lat), Number(suggestion.lon)])
                    setLocationSuggestions([])
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
              onClick={() => {
                setSelectedTool(tool.label)
                setFeedback(`${tool.label} activado`)
              }}
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
              onClick={() =>
                setFeedback(
                  `${selectedTool} activo · Arrástralo o selecciónalo en el mapa`,
                )
              }
            />
          )}
        </div>
        <div className="ribbon-separator" />
        <div className="ribbon-block compact">
          <span className="block-label">CAPAS</span>
          <Button
            className="small-control"
            onClick={() => {
              setMapTheme((current) =>
                current === "base" ? "technical" : "base",
              )
              setFeedback(
                mapTheme === "base"
                  ? "Mapa técnico activado"
                  : "Mapa base activado",
              )
            }}
          >
            <Icon name="layers" size={16} />
            {mapTheme === "base" ? "Mapa base" : "Mapa técnico"}
            <Icon name="chevron" size={14} />
          </Button>
          <Button
            className="small-control"
            onClick={() => {
              setZoom(72)
              setPan({ x: 0, y: 0 })
              setMapMode("select")
              setFeedback("Escena ajustada al viewport")
            }}
          >
            <Icon name="settings" size={16} />
            Ajustar escena
          </Button>
        </div>
      </section>

      <div className="workspace">
        <section className="editor-pane">
          <div className="scene-tabs">
            <div className="scene-tab-list">
              {frames.map((frame, index) => (
                <Button
                  className={`scene-tab ${
                    selectedFrame === index ? "is-active" : ""
                  }`}
                  key={`${frame}-${index}`}
                  onClick={() => setSelectedFrame(index)}
                >
                  <span className="frame-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {frame}
                </Button>
              ))}
              <Button
                className="add-scene"
                disabled={frames.length >= MAX_FRAMES}
                onClick={addFrame}
                title={
                  frames.length >= MAX_FRAMES
                    ? "Límite de 30 escenas alcanzado"
                    : "Agregar estado"
                }
              >
                <Icon name="plus" />
              </Button>
            </div>
            <div className="scene-state">
              <span className="live-dot" />
              Editando: {frames[selectedFrame]}
            </div>
          </div>

          <div
            className={`map-canvas ${
              mapMode === "pan" ? "is-pan-mode" : ""
            } ${isPanning ? "is-panning" : ""} ${
              mapTheme === "technical" ? "is-technical" : ""
            }`}
            onDragOver={(event) => {
              if (
                event.dataTransfer.types.includes("application/x-cesvi-item") ||
                event.dataTransfer.types.includes(
                  "application/x-cesvi-map-item",
                )
              ) {
                event.preventDefault()
                event.dataTransfer.dropEffect = event.dataTransfer.types.includes(
                  "application/x-cesvi-map-item",
                )
                  ? "move"
                  : "copy"
              }
            }}
            onDrop={dropCatalogItem}
            onPointerDown={startPan}
            onPointerMove={(event) => {
              movePan(event)
              moveMapElement(event)
            }}
            onPointerUp={(event) => {
              stopPan(event)
              setActiveElementDrag(null)
              setSmartGuides({ x: null, y: null })
            }}
            onPointerCancel={(event) => {
              stopPan(event)
              setActiveElementDrag(null)
              setSmartGuides({ x: null, y: null })
            }}
            onWheel={(event) => {
              if ((event.target as HTMLElement).closest(".leaflet-container")) return
              event.preventDefault()
              changeZoom(event.deltaY < 0 ? 4 : -4)
            }}
          >
            <MapContainer
              className="leaflet-map"
              center={DEFAULT_MAP_CENTER}
              zoom={13}
              zoomControl
              attributionControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport center={mapCenter} />
            </MapContainer>
            <div
              className="canvas-infinite-grid"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${
                  zoom / 72
                })`,
              }}
            />
            <div
              className="map-world"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${
                  zoom / 72
                })`,
              }}
            >
              {smartGuides.x !== null && (
                <div
                  className="smart-guide smart-guide-vertical"
                  style={{ left: `${smartGuides.x}%` }}
                >
                  <span>Alineado</span>
                </div>
              )}
              {smartGuides.y !== null && (
                <div
                  className="smart-guide smart-guide-horizontal"
                  style={{ top: `${smartGuides.y}%` }}
                >
                  <span>Alineado</span>
                </div>
              )}
              <div className="map-block block-a" />
              <div className="map-block block-b" />
              <div className="map-block block-c" />
              <div className="map-block block-d" />
              <div className="map-park park-a">
                <span />
                <span />
                <span />
              </div>
              <svg
                className="roads"
                preserveAspectRatio="none"
                viewBox="0 0 1000 560"
              >
                <path
                  className="road-outer"
                  d="M-30 470C160 390 240 300 408 260S660 230 1030 24"
                />
                <path
                  className="road-inner"
                  d="M-30 470C160 390 240 300 408 260S660 230 1030 24"
                />
                <path
                  className="road-line"
                  d="M-30 470C160 390 240 300 408 260S660 230 1030 24"
                />
                <path
                  className="cross-road-outer"
                  d="M245-30c-5 170 35 260 150 350s200 120 260 270"
                />
                <path
                  className="cross-road-inner"
                  d="M245-30c-5 170 35 260 150 350s200 120 260 270"
                />
                <path
                  className="cross-road-line"
                  d="M245-30c-5 170 35 260 150 350s200 120 260 270"
                />
              </svg>
              <div className="street-label street-one">PASEO DE LA REFORMA</div>
              <div className="street-label street-two">AV. INSURGENTES</div>
              <div className="poi poi-one">
                <span>M</span>
                Estación Reforma
              </div>
              <div className="poi poi-two">
                <span>+</span>
                Centro Médico
              </div>
              <Button
                className={`map-vehicle vehicle-a ${
                  selectedVehicleId === "V1" ? "selected-object" : ""
                }`}
                onClick={() => {
                  setSelectedVehicleId("V1")
                  setSelectedDroppedId(null)
                }}
                onPointerDown={(event) =>
                  beginElementDrag(event, {
                    id: "V1",
                    mode: "move",
                    type: "vehicle",
                  })
                }
                style={{
                  left: `${mapVehicles.V1.x}%`,
                  top: `${mapVehicles.V1.y}%`,
                  transform: `rotate(${mapVehicles.V1.rotation}deg) scale(${mapVehicles.V1.scale})`,
                }}
                title="Vehículo 1 · Arrastra para cambiar su posición"
              >
                <VehicleSprite />
                <span className="direction-line" />
                <b>V1</b>
              </Button>
              {selectedVehicleId === "V1" && (
                <>
                  <Button
                    className="rotation-handle rotation-handle-vehicle"
                    onPointerDown={(event) =>
                      beginElementRotation(event, "vehicle", "V1")
                    }
                    style={{
                      left: `${mapVehicles.V1.x}%`,
                      top: `${mapVehicles.V1.y}%`,
                    }}
                    title="Arrastra para rotar Vehículo 1"
                  >
                    <Icon name="redo" size={12} />
                  </Button>
                  <Button
                    className="scale-handle scale-handle-vehicle"
                    onPointerDown={(event) =>
                      beginElementScale(event, "vehicle", "V1")
                    }
                    style={{
                      left: `${mapVehicles.V1.x}%`,
                      top: `${mapVehicles.V1.y}%`,
                    }}
                    title="Arrastra para escalar proporcionalmente"
                  >
                    <span />
                  </Button>
                </>
              )}
              <Button
                className={`map-vehicle vehicle-b ${
                  selectedVehicleId === "V2" ? "selected-object" : ""
                }`}
                onClick={() => {
                  setSelectedVehicleId("V2")
                  setSelectedDroppedId(null)
                }}
                onPointerDown={(event) =>
                  beginElementDrag(event, {
                    id: "V2",
                    mode: "move",
                    type: "vehicle",
                  })
                }
                style={{
                  left: `${mapVehicles.V2.x}%`,
                  top: `${mapVehicles.V2.y}%`,
                  transform: `rotate(${mapVehicles.V2.rotation}deg) scale(${mapVehicles.V2.scale})`,
                }}
                title="Vehículo 2 · Arrastra para cambiar su posición"
              >
                <VehicleSprite />
                <b>V2</b>
              </Button>
              {selectedVehicleId === "V2" && (
                <>
                  <Button
                    className="rotation-handle rotation-handle-vehicle"
                    onPointerDown={(event) =>
                      beginElementRotation(event, "vehicle", "V2")
                    }
                    style={{
                      left: `${mapVehicles.V2.x}%`,
                      top: `${mapVehicles.V2.y}%`,
                    }}
                    title="Arrastra para rotar Vehículo 2"
                  >
                    <Icon name="redo" size={12} />
                  </Button>
                  <Button
                    className="scale-handle scale-handle-vehicle"
                    onPointerDown={(event) =>
                      beginElementScale(event, "vehicle", "V2")
                    }
                    style={{
                      left: `${mapVehicles.V2.x}%`,
                      top: `${mapVehicles.V2.y}%`,
                    }}
                    title="Arrastra para escalar proporcionalmente"
                  >
                    <span />
                  </Button>
                </>
              )}
              <div className="impact-marker">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="evidence-marker evidence-one">E1</div>
              <div className="evidence-marker evidence-two">E2</div>
              {droppedItems.map((item) => (
                <Fragment key={item.id}>
                  <Button
                    className={`dropped-map-item dropped-map-${item.kind} ${
                      selectedDroppedId === item.id ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedDroppedId(item.id)
                      setSelectedVehicleId("")
                      setSelectedTool(item.label)
                    }}
                    onPointerDown={(event) => {
                      setSelectedTool(item.label)
                      beginElementDrag(event, {
                        id: item.id,
                        mode: "move",
                        type: "dropped",
                      })
                    }}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    title={`${item.label} · Arrastra para mover · Supr para eliminar`}
                  >
                    <span
                      className={`dropped-map-symbol material-${getMaterialType(
                        item.label,
                        item.kind,
                      )}`}
                      style={{
                        transform: `rotate(${item.rotation}deg) scale(${item.scale})`,
                      }}
                    >
                      {item.kind === "vehicle" ||
                      item.kind === "static-vehicle" ? (
                        <VehicleSprite
                          parked={item.kind === "static-vehicle"}
                          variant={getVehicleVariant(item.label)}
                        />
                      ) : (
                        <Icon
                          name={getDroppedItemIcon(item.kind, item.label)}
                          size={18}
                        />
                      )}
                    </span>
                    <span>{item.label}</span>
                  </Button>
                  {selectedDroppedId === item.id && (
                    <>
                      <Button
                        className="rotation-handle"
                        onPointerDown={(event) =>
                          beginElementRotation(event, "dropped", item.id)
                        }
                        style={{ left: `${item.x}%`, top: `${item.y}%` }}
                        title={`Arrastra para rotar ${item.label}`}
                      >
                        <Icon name="redo" size={12} />
                      </Button>
                      <Button
                        className="scale-handle"
                        onPointerDown={(event) =>
                          beginElementScale(event, "dropped", item.id)
                        }
                        style={{ left: `${item.x}%`, top: `${item.y}%` }}
                        title={`Arrastra para escalar ${item.label}`}
                      >
                        <span />
                      </Button>
                    </>
                  )}
                </Fragment>
              ))}
            </div>

            <div className="map-toolbar">
              <Button
                className={`map-tool ${
                  mapMode === "select" ? "is-active" : ""
                }`}
                onClick={() => setMapMode("select")}
                title="Seleccionar"
              >
                <span className="cursor-arrow">↖</span>
              </Button>
              <Button
                className={`map-tool ${mapMode === "pan" ? "is-active" : ""}`}
                onClick={() => setMapMode("pan")}
                title="Mover mapa"
              >
                <Icon name="map" size={17} />
              </Button>
              <Button
                className={`map-tool ${
                  mapMode === "measure" ? "is-active" : ""
                }`}
                onClick={() => setMapMode("measure")}
                title="Medir"
              >
                <span className="ruler-icon">⌁</span>
              </Button>
            </div>
            <div className="zoom-controls">
              <Button
                className="map-tool"
                onClick={() => changeZoom(8)}
                title="Acercar"
              >
                <Icon name="plus" size={16} />
              </Button>
              <Button
                className="zoom-value"
                onClick={() => {
                  setZoom(72)
                  setPan({ x: 0, y: 0 })
                }}
                title="Restablecer vista"
              >
                {zoom}%
              </Button>
              <Button
                className="map-tool"
                onClick={() => changeZoom(-8)}
                title="Alejar"
              >
                <Icon name="minus" size={16} />
              </Button>
            </div>
            <div className="north-indicator">
              <span>N</span>
              <i />
            </div>

            {inspectorOpen ? (
              <div className="object-inspector">
                <div className="inspector-head">
                  <div>
                    <span className="object-tag">VEHÍCULO 01</span>
                    <b>Nissan Versa 2021</b>
                  </div>
                  <Button
                    className="icon-button subtle"
                    onClick={() => setInspectorOpen(false)}
                    title="Colapsar propiedades"
                  >
                    <Icon name="close" size={16} />
                  </Button>
                </div>
                <div className="inspector-grid">
                  <label>
                    <span>Tipo</span>
                    <select defaultValue="Automóvil">
                      <option>Automóvil</option>
                      <option>Camión</option>
                      <option>Motocicleta</option>
                    </select>
                  </label>
                  <label>
                    <span>Velocidad</span>
                    <div className="field-with-unit">
                      <input defaultValue="42" />
                      <i>km/h</i>
                    </div>
                  </label>
                  <label>
                    <span>Dirección</span>
                    <select defaultValue="Noreste">
                      <option>Noreste</option>
                      <option>Norte</option>
                      <option>Este</option>
                    </select>
                  </label>
                  <label>
                    <span>Frenado</span>
                    <div className="field-with-unit">
                      <input defaultValue="8.4" />
                      <i>m</i>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <Button
                className="inspector-reopen"
                onClick={() => setInspectorOpen(true)}
                title="Abrir propiedades de Vehículo 1"
              >
                <Icon name="car" size={16} />
                <span>Vehículo 1</span>
                <Icon name="chevron" size={13} />
              </Button>
            )}
          </div>

          <div className="timeline">
            <span className="timeline-start">00:00</span>
            <div className="timeline-controls">
              <Button
                className="timeline-control timeline-previous"
                disabled={selectedFrame === 0}
                onClick={() => {
                  setPlaying(false)
                  setSelectedFrame((current) => Math.max(0, current - 1))
                }}
                title="Escena anterior"
              >
                <Icon name="arrow" size={15} />
              </Button>
              <Button
                className="timeline-control timeline-play"
                onClick={() => {
                  if (!playing && selectedFrame === frames.length - 1)
                    setSelectedFrame(0)
                  setPlaying((current) => !current)
                }}
                title={playing ? "Pausar" : "Reproducir"}
              >
                <Icon name={playing ? "pause" : "play"} size={16} />
              </Button>
              <Button
                className="timeline-control"
                disabled={selectedFrame === frames.length - 1}
                onClick={() => {
                  setPlaying(false)
                  setSelectedFrame((current) =>
                    Math.min(frames.length - 1, current + 1),
                  )
                }}
                title="Escena siguiente"
              >
                <Icon name="arrow" size={15} />
              </Button>
            </div>
            <div className="timeline-impact">
              <span>Impacto · 00:03.38</span>
              <i aria-hidden="true" />
            </div>
            <div className="timeline-rail">
              <div
                className="timeline-progress"
                aria-hidden="true"
                style={{
                  width: `${
                    frames.length > 1
                      ? (selectedFrame / (frames.length - 1)) * 100
                      : 0
                  }%`,
                }}
              >
                <span />
                <span className="timeline-playhead" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <aside className="assistant-pane">
          <div className="assistant-header">
            <div className="assistant-identity">
              <span className="assistant-logo">
                <Icon name="sparkle" size={18} />
              </span>
              <div>
                <b>Asistente pericial</b>
                <span>Reconstrucción guiada</span>
              </div>
            </div>
            <Button
              ariaExpanded={assistantOptionsOpen}
              className="icon-button"
              onClick={() => setAssistantOptionsOpen((current) => !current)}
              title="Opciones del asistente"
            >
              <Icon name="more" />
            </Button>
            {assistantOptionsOpen && (
              <div className="assistant-options">
                <Button
                  onClick={() => {
                    setMessages([])
                    setAssistantOptionsOpen(false)
                    setFeedback("Conversación limpiada")
                  }}
                >
                  Limpiar conversación
                </Button>
                <Button
                  onClick={() => {
                    setInspectorOpen(true)
                    setAssistantOptionsOpen(false)
                    setFeedback("Propiedades del vehículo visibles")
                  }}
                >
                  Mostrar propiedades
                </Button>
              </div>
            )}
          </div>

          <div className="case-progress">
            <div className="progress-copy">
              <span>PROGRESO DEL EXPEDIENTE</span>
              <b>62%</b>
            </div>
            <div className="progress-track">
              <span />
            </div>
            <div className="steps">
              {[
                "Ubicación",
                "Vehículos",
                "Dinámica",
                "Evidencia",
                "Informe",
              ].map((step, index) => (
                <div
                  className={index < 3 ? "done" : index === 3 ? "current" : ""}
                  key={step}
                >
                  <span>{index < 3 ? "✓" : index + 1}</span>
                  <small>{step}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="conversation">
            <div className="date-divider">
              <span />
              <b>DINÁMICA DEL SINIESTRO</b>
              <span />
            </div>
            <div className="assistant-message">
              <div className="message-avatar">
                <Icon name="sparkle" size={15} />
              </div>
              <div className="message-bubble">
                <p>
                  Ya tenemos los dos vehículos ubicados. Ahora vamos a
                  documentar el momento del impacto.
                </p>
                <p>
                  ¿Cuál era la velocidad estimada del <b>Vehículo 01</b> antes
                  de iniciar el frenado?
                </p>
                <span>10:42</span>
              </div>
            </div>
            <div className="quick-options">
              <Button onClick={() => setChatText("Entre 40 y 50 km/h")}>
                Entre 40 y 50 km/h
              </Button>
              <Button onClick={() => setChatText("No se pudo determinar")}>
                No se pudo determinar
              </Button>
            </div>
            {messages.map((message, index) => (
              <div className="user-message" key={`${message}-${index}`}>
                <div className="message-bubble">
                  <p>{message}</p>
                  <span>Ahora</span>
                </div>
              </div>
            ))}
            <div className="context-card">
              <div className="context-head">
                <span>
                  <Icon name="car" size={17} />
                </span>
                <div>
                  <b>Vehículo 01</b>
                  <small>Elemento seleccionado en el mapa</small>
                </div>
              </div>
              <div className="context-stats">
                <div>
                  <span>Velocidad</span>
                  <b>42 km/h</b>
                </div>
                <div>
                  <span>Trayectoria</span>
                  <b>Noreste</b>
                </div>
                <div>
                  <span>Confianza</span>
                  <b className="confidence">Media</b>
                </div>
              </div>
            </div>
          </div>

          <div className="chat-composer">
            <div className="composer-box">
              <textarea
                aria-label="Responder al asistente"
                onChange={(event) => setChatText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Escribe un dato, observación o instrucción..."
                value={chatText}
              />
              <div className="composer-actions">
                <Button
                  className="attach-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="plus" size={17} />
                  Adjuntar evidencia
                </Button>
                <input
                  accept="image/*,.pdf"
                  className="evidence-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) setFeedback(`${file.name} adjuntado al expediente`)
                    event.target.value = ""
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  className="send-button"
                  disabled={assistantLoading}
                  onClick={sendMessage}
                  title="Enviar"
                >
                  <Icon name="send" size={17} />
                </Button>
              </div>
            </div>
            <span className="privacy-note">
              La información se guarda en el expediente EXP-0248
            </span>
          </div>
        </aside>
      </div>

      {showDashboard && (
        <div
          className="dashboard-overlay"
          onMouseDown={() => setShowDashboard(false)}
        >
          <div onMouseDown={(event) => event.stopPropagation()}>
            <Dashboard
              onClose={() => setShowDashboard(false)}
              onNewCase={createNewCase}
            />
          </div>
        </div>
      )}
      {feedback && (
        <div className="action-feedback" role="status">
          <span />
          {feedback}
        </div>
      )}
    </main>
  )
}

export default App
