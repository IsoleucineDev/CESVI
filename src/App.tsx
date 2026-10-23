import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, type CaseContext, type Scene } from "./lib/api";

type Theme = "light" | "dark";

type IconName =
  | "arrow"
  | "back"
  | "car"
  | "chevron"
  | "clock"
  | "close"
  | "dashboard"
  | "delete"
  | "download"
  | "edit"
  | "first"
  | "last"
  | "layers"
  | "map"
  | "message"
  | "minus"
  | "moon"
  | "paw"
  | "more"
  | "motorcycle"
  | "pause"
  | "person"
  | "play"
  | "plus"
  | "redo"
  | "search"
  | "send"
  | "settings"
  | "sign"
  | "sparkle"
  | "sun"
  | "tree"
  | "truck"
  | "undo"
  | "wall"
  | "warning";

/* Cada escena (pestaña) dura 1 segundo dentro del reproductor */
const STEP_SECONDS = 1;

const formatTime = (seconds: number) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}.0`;
};

const iconPaths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  back: <path d="m15 18-6-6 6-6" />,
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
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  first: <path d="M6 5v14M18 6l-8 6 8 6V6Z" />,
  last: <path d="M18 5v14M6 6l8 6-8 6V6Z" />,
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
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
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
  paw: (
    <>
      <circle cx="7" cy="10" r="1.6" />
      <circle cx="12" cy="7.5" r="1.6" />
      <circle cx="17" cy="10" r="1.6" />
      <path d="M12 12c-3 0-5 3-5 5 0 1.5 1.5 2 3 1.5 1.2-.4 1.8-.4 4 0 1.5.5 3 0 3-1.5 0-2-2-5-5-5Z" />
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
  sign: (
    <>
      <path d="M12 22V9M7 3h10l2 3-2 3H7L5 6l2-3Z" />
    </>
  ),
  sparkle: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  tree: <path d="M12 21v-6M12 3 6 12h3l-3 5h12l-3-5h3L12 3Z" />,
  truck: (
    <>
      <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  undo: <path d="M4 8h7a6 6 0 0 1 6 6v2M4 8l3-3M4 8l3 3" />,
  wall: <path d="M3 6h18v4H3zM3 14h18v4H3zM9 6v4M15 14v4" />,
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
};

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
  );
}

function Button({
  children,
  className = "",
  disabled,
  onClick,
  onDoubleClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  title?: string;
}) {
  return (
    <button
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolButton({
  active,
  icon,
  label,
  onClick,
  title,
}: {
  active?: boolean;
  icon: IconName;
  label: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Button className={`tool-button ${active ? "is-active" : ""}`} onClick={onClick} title={title ?? label}>
      <span className="tool-icon">
        <Icon name={icon} size={21} />
      </span>
      <span>{label}</span>
    </Button>
  );
}

type RibbonItem = { icon: IconName; label: string; title?: string };
type RibbonSection = { name: string; items: RibbonItem[] };

/* Cada pestaña = varios grupos; el nombre del grupo se muestra abajo (estilo Word) */
const ribbonGroups: Record<string, RibbonSection[]> = {
  Elementos: [
    {
      name: "Objetos duros o rígidos",
      items: [
        {
          icon: "wall",
          label: "Infraestructura vial fija",
          title: "Muros de protección, barandillas, vallas, señales, postes, pilares, bordillos y edificios",
        },
        {
          icon: "tree",
          label: "Naturales y desprendidos",
          title: "Elementos naturales u objetos desprendidos en la vía: árboles, rocas, vigas, troncos y neumáticos",
        },
        {
          icon: "car",
          label: "Vehículos estáticos",
          title: "Vehículos estacionados, detenidos o abandonados sobre la calzada o el arcén",
        },
      ],
    },
    {
      name: "Objetos o cuerpos blandos",
      items: [
        {
          icon: "person",
          label: "Cuerpos humanos",
          title: "Peatones, ciclistas, motociclistas u ocupantes de vehículos",
        },
        { icon: "paw", label: "Cuerpos animales", title: "Fauna silvestre o ganado" },
      ],
    },
  ],
  Escena: [
    {
      name: "Vehículos",
      items: [
        { icon: "car", label: "Sedán" },
        { icon: "truck", label: "Camión" },
        { icon: "motorcycle", label: "Motocicleta" },
      ],
    },
    {
      name: "Personas y señales",
      items: [
        { icon: "person", label: "Persona" },
        { icon: "sign", label: "Señal" },
      ],
    },
  ],
  Vehículos: [
    {
      name: "Tipo de vehículo",
      items: [
        { icon: "car", label: "Automóvil" },
        { icon: "truck", label: "Carga" },
        { icon: "motorcycle", label: "Motocicleta" },
        { icon: "plus", label: "Otro" },
      ],
    },
  ],
  Plantillas: [
    {
      name: "Escenarios",
      items: [
        { icon: "map", label: "Intersección" },
        { icon: "warning", label: "Alcance" },
        { icon: "layers", label: "Cambio de carril" },
      ],
    },
    { name: "Personalizadas", items: [{ icon: "plus", label: "Nueva" }] },
  ],
};

const frameNames = ["Inicio", "Aproximación", "Impacto", "Posición final"];

function Dashboard({ onClose }: { onClose: () => void }) {
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
          ["EXP-0248", "Colisión en Av. Reforma", "Editado hace 12 min", "En curso"],
          ["EXP-0245", "Alcance en Insurgentes Sur", "Ayer, 18:42", "Revisión"],
          ["EXP-0239", "Cruce de Calz. de Tlalpan", "12 jun, 10:16", "Completado"],
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
            <span className={`status status-${status.toLowerCase().replace("ó", "o")}`}>{status}</span>
            <Icon name="arrow" />
          </Button>
        ))}
      </div>
      <Button className="primary-button">
        <Icon name="plus" />
        Nuevo expediente
      </Button>
    </div>
  );
}

type VehiclePosition = { lat: number; lng: number };

type VehicleOverlayProps = {
  id: string;
  label: string;
  position: VehiclePosition;
  color: string;
  rotation: number;
  selected?: boolean;
  onPositionChange: (position: VehiclePosition) => void;
  onRotationChange: (rotation: number) => void;
};

function VehicleOverlay({
  id,
  label,
  position,
  color,
  rotation,
  selected = false,
  onPositionChange,
  onRotationChange,
}: VehicleOverlayProps) {
  const map = useMap();
  const [revision, setRevision] = useState(0);
  const dragRef = useRef<
    | { mode: "move"; offsetX: number; offsetY: number }
    | { mode: "rotate"; centerX: number; centerY: number }
    | null
  >(null);

  useEffect(() => {
    const redraw = () => setRevision((value) => value + 1);
    map.on("zoom move resize", redraw);
    return () => {
      map.off("zoom move resize", redraw);
    };
  }, [map]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const rect = map.getContainer().getBoundingClientRect();
      if (dragRef.current.mode === "move") {
        // A screen-pixel drag is converted back through Leaflet's current CRS.
        const correctedPoint = [
          event.clientX - rect.left - dragRef.current.offsetX,
          event.clientY - rect.top - dragRef.current.offsetY,
        ] as [number, number];
        const nextLatLng = map.containerPointToLatLng([correctedPoint.x, correctedPoint.y]);
        onPositionChange({ lat: nextLatLng.lat, lng: nextLatLng.lng });
      } else {
        const angle = (Math.atan2(event.clientY - dragRef.current.centerY, event.clientX - dragRef.current.centerX) * 180) / Math.PI;
        onRotationChange(angle + 90);
      }
    };
    const handlePointerUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [map, onPositionChange, onRotationChange, position]);

  const pane = map.getPanes().overlayPane;
  if (!pane) return null;

  const zoom = map.getZoom();
  const anchor = map.latLngToLayerPoint(position);
  const projected = map.project(position, zoom);
  const latitudeMeters = 111_320;
  const longitudeMeters = latitudeMeters * Math.cos((position.lat * Math.PI) / 180);
  const lengthEndpoint = map.project(
    [position.lat, position.lng + 4.5 / longitudeMeters],
    zoom,
  );
  const widthEndpoint = map.project([position.lat + 1.8 / latitudeMeters, position.lng], zoom);
  // Leaflet's projected world scale is pixels per CRS unit. Projecting a point
  // displaced by the real-world dimensions yields the exact screen footprint
  // at the active latitude and zoom, including Web Mercator scale distortion.
  const lengthPixels = Math.max(24, Math.abs(lengthEndpoint.x - projected.x));
  const widthPixels = Math.max(14, Math.abs(widthEndpoint.y - projected.y));
  const rect = map.getContainer().getBoundingClientRect();
  const center = map.latLngToContainerPoint(position);

  return createPortal(
    <div
      className={`leaflet-vehicle ${selected ? "selected-object" : ""}`}
      data-vehicle-id={id}
      data-map-revision={revision}
      onPointerDown={(event) => {
        event.stopPropagation();
        const target = event.target as HTMLElement;
        if (target.classList.contains("rotation-handle")) {
          dragRef.current = {
            mode: "rotate",
            centerX: rect.left + center.x,
            centerY: rect.top + center.y,
          };
          return;
        }
        const point = map.latLngToContainerPoint(position);
        const pointerPoint = [event.clientX - rect.left, event.clientY - rect.top];
        dragRef.current = {
          mode: "move",
          offsetX: pointerPoint[0] - point.x,
          offsetY: pointerPoint[1] - point.y,
        };
      }}
      style={{
        height: `${lengthPixels}px`,
        left: `${anchor.x}px`,
        top: `${anchor.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: `${widthPixels}px`,
        background: color,
      }}
    >
      <Icon name="car" size={Math.max(18, Math.min(30, widthPixels * 0.7))} />
      <b>{label}</b>
      {selected && <span className="rotation-handle" title="Arrastrar para rotar" />}
    </div>,
    pane,
  );
}

function MapZoomControls() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on("zoomend", update);
    return () => map.off("zoomend", update);
  }, [map]);

  return (
    <div className="zoom-controls">
      <Button className="map-tool" onClick={() => map.zoomIn()} title="Acercar">
        <Icon name="plus" size={16} />
      </Button>
      <span>{zoom}</span>
      <Button className="map-tool" onClick={() => map.zoomOut()} title="Alejar">
        <Icon name="minus" size={16} />
      </Button>
    </div>
  );
}

function MapToolbar() {
  const map = useMap();
  return (
    <>
      <div className="map-toolbar">
        <Button className="map-tool is-active" title="Seleccionar">
          <span className="cursor-arrow">↖</span>
        </Button>
        <Button className="map-tool" onClick={() => map.dragging.enable()} title="Mover mapa">
          <Icon name="map" size={17} />
        </Button>
        <Button className="map-tool" title="Medir">
          <span className="ruler-icon">⌁</span>
        </Button>
      </div>
      <MapZoomControls />
      <div className="north-indicator">
        <span>N</span>
        <i />
      </div>
    </>
  );
}

function App() {
  const [ribbon, setRibbon] = useState<string>("Elementos");
  const [selectedTool, setSelectedTool] = useState("Infraestructura vial fija");
  const [selectedFrame, setSelectedFrame] = useState(2);
  const [frames, setFrames] = useState(frameNames);
  const [sceneRecords, setSceneRecords] = useState<Scene[]>([]);
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [vehicleOne, setVehicleOne] = useState<VehiclePosition>({ lat: 19.427, lng: -99.167 });
  const [vehicleTwo, setVehicleTwo] = useState<VehiclePosition>({ lat: 19.429, lng: -99.164 });
  const [vehicleOneRotation, setVehicleOneRotation] = useState(38);
  const [vehicleTwoRotation, setVehicleTwoRotation] = useState(-61);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const skipCommit = useRef(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const activeSections = ribbonGroups[ribbon] ?? [];
  const stepLabel = useMemo(() => `${selectedFrame + 1} / ${frames.length}`, [selectedFrame, frames]);

  /* ---------- Valores del reproductor ---------- */
  const lastIndex = frames.length - 1;
  const positionOf = (index: number) => (lastIndex > 0 ? (index / lastIndex) * 100 : 0);
  const progress = positionOf(selectedFrame);
  const currentTime = selectedFrame * STEP_SECONDS;
  const totalTime = Math.max(lastIndex, 0) * STEP_SECONDS;

  /* ---------- Efectos ---------- */
  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getCase(), api.getScenes()]).then(([caseResult, scenesResult]) => {
      if (!active) return;
      if (caseResult.status === "fulfilled") {
        setCaseContext(caseResult.value);
      }
      if (scenesResult.status === "fulfilled" && scenesResult.value.length > 0) {
        const orderedScenes = [...scenesResult.value].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        setSceneRecords(orderedScenes);
        setFrames(orderedScenes.map((scene) => scene.name));
        setSelectedFrame((current) => Math.min(current, orderedScenes.length - 1));
      }
      const failedResult = [caseResult, scenesResult].find((result) => result.status === "rejected");
      setDataError(
        failedResult?.status === "rejected"
          ? failedResult.reason instanceof Error
            ? failedResult.reason.message
            : "No se pudo cargar toda la información del expediente"
          : null,
      );
    });
    return () => {
      active = false;
    };
  }, []);

  // Avanza una escena por segundo mientras está reproduciendo
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setSelectedFrame((current) => (current < frames.length - 1 ? current + 1 : current));
    }, STEP_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, [playing, frames.length]);

  // Se detiene al llegar a la última escena
  useEffect(() => {
    if (playing && selectedFrame >= frames.length - 1) setPlaying(false);
  }, [playing, selectedFrame, frames.length]);

  /* ---------- Acciones ---------- */
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (selectedFrame >= frames.length - 1) setSelectedFrame(0);
    setPlaying(true);
  };

  const startRename = (index: number) => {
    skipCommit.current = false;
    setDraftName(frames[index]);
    setEditingIndex(index);
  };

  const commitRename = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    if (editingIndex === null) return;
    const name = draftName.trim();
    if (name) {
      setFrames((current) => current.map((frame, i) => (i === editingIndex ? name : frame)));
      const scene = sceneRecords[editingIndex];
      if (scene?.id) {
        void api.updateScene(scene.id, name).catch((error: unknown) => {
          setDataError(error instanceof Error ? error.message : "No se pudo guardar la escena");
        });
      }
    }
    setEditingIndex(null);
  };

  const addFrame = () => {
    const name = `Escena ${frames.length + 1}`;
    const order = frames.length;
    setFrames((current) => [...current, name]);
    setSceneRecords((current) => [...current, { name, order }]);
    setSelectedFrame(frames.length);
    skipCommit.current = false;
    setDraftName(name);
    setEditingIndex(frames.length); // abre el campo para nombrarla de inmediato
    void api
      .createScene(name, order)
      .then((scene) => {
        setSceneRecords((current) =>
          current.map((item, index) => (index === order ? scene : item)),
        );
      })
      .catch((error: unknown) => {
        setDataError(error instanceof Error ? error.message : "No se pudo crear la escena");
      });
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    const scene = sceneRecords[selectedFrame];
    setEditingIndex(null);
    setFrames((current) => current.filter((_, index) => index !== selectedFrame));
    setSceneRecords((current) => current.filter((_, index) => index !== selectedFrame));
    setSelectedFrame((current) => Math.max(0, current - 1));
    if (scene?.id) {
      void api.deleteScene(scene.id).catch((error: unknown) => {
        setDataError(error instanceof Error ? error.message : "No se pudo eliminar la escena");
      });
    }
  };

  const sendMessage = async () => {
    if (!chatText.trim() || assistantLoading) return;
    const message = chatText.trim();
    setChatText("");
    setMessages((current) => [...current, message, ""]);
    setAssistantLoading(true);
    try {
      await api.sendAssistantMessage(
        message,
        {
          case: caseContext,
          scene: frames[selectedFrame],
          selectedTool,
          selectedFrame,
        },
        (token) => {
          setMessages((current) => {
            const next = [...current];
            next[next.length - 1] = `${next[next.length - 1]}${token}`;
            return next;
          });
        },
      );
    } catch (error: unknown) {
      setMessages((current) => current.slice(0, -1));
      setDataError(error instanceof Error ? error.message : "No se pudo contactar al asistente");
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <main className="app-shell" data-theme={theme}>
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
            <span>R</span>
          </div>
          <div className="document-name">
            <b>Reconstrucción vial</b>
            <span>EXP-0248 · Guardado</span>
          </div>
        </div>
        <nav className="ribbon-tabs" aria-label="Herramientas principales">
          {["Archivo", "Elementos", "Escena", "Vehículos", "Plantillas", "Vista"].map((tab) => (
            <Button
              className={ribbon === tab ? "tab-active" : ""}
              key={tab}
              onClick={() => {
                if (tab in ribbonGroups) setRibbon(tab);
              }}
            >
              {tab}
            </Button>
          ))}
        </nav>
        <div className="title-actions">
          <Button className="icon-button" title="Deshacer">
            <Icon name="undo" />
          </Button>
          <Button className="icon-button" title="Rehacer">
            <Icon name="redo" />
          </Button>
          <Button
            className="icon-button theme-toggle"
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            title={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </Button>
          <span className="divider" />
          <Button className="share-button">
            <Icon name="download" />
            Exportar informe
          </Button>
          <div className="avatar">LM</div>
        </div>
      </header>

      {/* Ribbon estilo Word: ubicación a la izquierda, grupos de herramientas al centro */}
      <section className="ribbon">
        <div className="ribbon-group ribbon-left">
          <div className="ribbon-group-body">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input aria-label="Buscar ubicación" defaultValue="Av. Paseo de la Reforma 222" />
              <kbd>↵</kbd>
            </label>
            <span className="maps-note">Datos cartográficos</span>
          </div>
          <span className="ribbon-group-label">Ubicación</span>
        </div>
        <div className="ribbon-groups">
          {activeSections.map((section) => (
            <div className="ribbon-group" key={`${ribbon}-${section.name}`}>
              <div className="ribbon-group-body">
                {section.items.map((tool) => (
                  <ToolButton
                    active={selectedTool === tool.label}
                    icon={tool.icon}
                    key={tool.label}
                    label={tool.label}
                    onClick={() => setSelectedTool(tool.label)}
                    title={tool.title}
                  />
                ))}
              </div>
              <span className="ribbon-group-label">{section.name}</span>
            </div>
          ))}
        </div>
        <div className="ribbon-spacer" aria-hidden="true" />
      </section>

      <div className="workspace">
        <section className="editor-pane">
          <div className="scene-tabs">
            <div className="scene-tab-list">
              {frames.map((frame, index) =>
                editingIndex === index ? (
                  <div className="scene-tab is-active is-editing" key={index}>
                    <span className="frame-number">{String(index + 1).padStart(2, "0")}</span>
                    <input
                      aria-label="Nombre de la escena"
                      autoFocus
                      className="scene-tab-input"
                      maxLength={28}
                      onBlur={commitRename}
                      onChange={(event) => setDraftName(event.target.value)}
                      onFocus={(event) => event.target.select()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") {
                          skipCommit.current = true;
                          setEditingIndex(null);
                        }
                      }}
                      value={draftName}
                    />
                  </div>
                ) : (
                  <Button
                    className={`scene-tab ${selectedFrame === index ? "is-active" : ""}`}
                    key={index}
                    onClick={() => setSelectedFrame(index)}
                    onDoubleClick={() => startRename(index)}
                    title="Doble clic para renombrar"
                  >
                    <span className="frame-number">{String(index + 1).padStart(2, "0")}</span>
                    {frame}
                  </Button>
                ),
              )}
              <Button className="add-scene" onClick={addFrame} title="Agregar escena">
                <Icon name="plus" />
              </Button>
            </div>
            <div className="scene-state">
              <span className="live-dot" />
              Editando: {frames[selectedFrame]}
            </div>
          </div>

          <div className="map-canvas">
            <MapContainer
              center={[19.428, -99.166] as LatLngExpression}
              className="leaflet-map"
              doubleClickZoom={false}
              scrollWheelZoom
              zoom={16}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <VehicleOverlay
                id="vehicle-1"
                label="V1"
                onPositionChange={setVehicleOne}
                onRotationChange={setVehicleOneRotation}
                position={vehicleOne}
                rotation={vehicleOneRotation}
                selected
                color="#d8e0e3"
              />
              <VehicleOverlay
                id="vehicle-2"
                label="V2"
                onPositionChange={setVehicleTwo}
                onRotationChange={setVehicleTwoRotation}
                position={vehicleTwo}
                rotation={vehicleTwoRotation}
                color="#d4965b"
              />
              <MapToolbar />

              <div className="object-inspector">
              <div className="inspector-head">
                <div>
                  <span className="object-tag">VEHÍCULO 01</span>
                  <b>Nissan Versa 2021</b>
                </div>
                <Button className="icon-button subtle" title="Más opciones">
                  <Icon name="more" />
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
              </MapContainer>
            </div>

          {/* Reproductor: recorre las escenas de Inicio a Posición final */}
          <div className="timeline">
            <div className="player-controls">
              <Button
                className="transport secondary"
                onClick={() => setSelectedFrame(0)}
                title="Ir al inicio"
              >
                <Icon name="first" size={16} />
              </Button>
              <Button
                className="transport secondary"
                onClick={() => setSelectedFrame((c) => Math.max(0, c - 1))}
                title="Escena anterior"
              >
                <Icon name="back" size={17} />
              </Button>
              <Button
                className="transport primary"
                onClick={togglePlay}
                title={playing ? "Pausar" : "Reproducir"}
              >
                <Icon name={playing ? "pause" : "play"} size={20} />
              </Button>
              <Button
                className="transport secondary"
                onClick={() => setSelectedFrame((c) => Math.min(lastIndex, c + 1))}
                title="Escena siguiente"
              >
                <Icon name="arrow" size={17} />
              </Button>
              <Button
                className="transport secondary"
                onClick={() => setSelectedFrame(lastIndex)}
                title="Ir al final"
              >
                <Icon name="last" size={16} />
              </Button>
            </div>

            <div className="seek">
              <div className="seek-bar">
                <div className="seek-fill" style={{ width: `${progress}%` }} />
                {frames.map((_, index) => (
                  <span
                    className={`seek-dot ${index <= selectedFrame ? "is-reached" : ""} ${
                      index === selectedFrame ? "is-current" : ""
                    }`}
                    key={index}
                    style={{ left: `${positionOf(index)}%` }}
                  />
                ))}
                <input
                  aria-label="Posición del reproductor"
                  max={Math.max(lastIndex, 0)}
                  min={0}
                  onChange={(event) => setSelectedFrame(Number(event.target.value))}
                  step={1}
                  type="range"
                  value={selectedFrame}
                />
              </div>
              <div className="seek-labels">
                {frames.map((frame, index) => (
                  <button
                    className={`seek-label ${selectedFrame === index ? "is-active" : ""}`}
                    key={index}
                    onClick={() => setSelectedFrame(index)}
                    onDoubleClick={() => startRename(index)}
                    style={{ left: `${positionOf(index)}%` }}
                    title={frame}
                    type="button"
                  >
                    {frame}
                  </button>
                ))}
              </div>
            </div>

            <div className="player-info">
              <div className="player-time">
                <b>{formatTime(currentTime)}</b>
                <span>/ {formatTime(totalTime)}</span>
              </div>
              <div className="player-actions">
                <span className="frame-counter">Escena {stepLabel}</span>
                <Button
                  className="icon-button"
                  onClick={() => startRename(selectedFrame)}
                  title="Renombrar escena"
                >
                  <Icon name="edit" size={17} />
                </Button>
                <Button
                  className="icon-button"
                  disabled={frames.length <= 1}
                  onClick={deleteFrame}
                  title="Eliminar escena"
                >
                  <Icon name="delete" size={17} />
                </Button>
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
            <Button className="icon-button">
              <Icon name="more" />
            </Button>
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
              {["Ubicación", "Vehículos", "Dinámica", "Evidencia", "Informe"].map((step, index) => (
                <div className={index < 3 ? "done" : index === 3 ? "current" : ""} key={step}>
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
                  Ya tenemos los dos vehículos ubicados. Ahora vamos a documentar el momento del
                  impacto.
                </p>
                <p>
                  ¿Cuál era la velocidad estimada del <b>Vehículo 01</b> antes de iniciar el frenado?
                </p>
                <span>10:42</span>
              </div>
            </div>
            <div className="quick-options">
              <Button onClick={() => setChatText("Entre 40 y 50 km/h")}>Entre 40 y 50 km/h</Button>
              <Button onClick={() => setChatText("No se pudo determinar")}>No se pudo determinar</Button>
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
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Escribe un dato, observación o instrucción..."
                value={chatText}
              />
              <div className="composer-actions">
                <Button className="attach-button">
                  <Icon name="plus" size={17} />
                  Adjuntar evidencia
                </Button>
                <Button className="send-button" onClick={sendMessage} title="Enviar">
                  <Icon name="send" size={17} />
                </Button>
              </div>
            </div>
            <span className="privacy-note">La información se guarda en el expediente EXP-0248</span>
          </div>
        </aside>
      </div>

      {showDashboard && (
        <div className="dashboard-overlay" onMouseDown={() => setShowDashboard(false)}>
          <div onMouseDown={(event) => event.stopPropagation()}>
            <Dashboard onClose={() => setShowDashboard(false)} />
          </div>
        </div>
      )}
    </main>
  );
}

export default App;