import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";

type Theme = "light" | "dark";

type IconName =
  | "arrow"
  | "back"
  | "box"
  | "car"
  | "chevron"
  | "clock"
  | "close"
  | "dashboard"
  | "delete"
  | "download"
  | "droplet"
  | "edit"
  | "first"
  | "glass"
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
  | "route"
  | "search"
  | "send"
  | "settings"
  | "sign"
  | "sparkle"
  | "sun"
  | "tree"
  | "truck"
  | "tractor"
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
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
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
  droplet: <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  first: <path d="M6 5v14M18 6l-8 6 8 6V6Z" />,
  glass: <path d="M5 4h14M7 4l1 13a4 4 0 0 0 8 0l1-13M8 12h8M12 17v4M9 21h6" />,
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
  route: <path d="M5 4h.01M19 20h.01M5 4c0 8 14 4 14 12M5 20c0-5 5-5 9-5h5" />,
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
  tractor: (
    <>
      <path d="M4 15h10l2-6h3l2 6v3H4v-3ZM9 15V6h5l2 3" />
      <circle cx="8" cy="18" r="3" />
      <circle cx="19" cy="18" r="2" />
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
  role,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  role?: React.AriaRole;
  title?: string;
}) {
  return (
    <button
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role={role}
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

type CatalogTab = "objects" | "evidence" | "vehicles";
type CatalogItem = {
  id: string;
  label: string;
  group: string;
  detail: string;
  icon: IconName;
  tone: "infrastructure" | "biological" | "physical" | "vehicle";
  defaults: string;
};

const catalogItems: CatalogItem[] = [
  { id: "road-infrastructure", label: "Infraestructura vial fija", group: "Objetos duros o rígidos", detail: "Muros, guardarraíles, barreras, señales, postes, pilares, perfiles, hitos, bordillos y edificios.", icon: "wall", tone: "infrastructure", defaults: "Material: acero · μ: 0,60" },
  { id: "natural-object", label: "Naturales y desprendidos", group: "Objetos duros o rígidos", detail: "Árboles, rocas, vigas, troncos y neumáticos abandonados.", icon: "tree", tone: "infrastructure", defaults: "Masa: 80 kg · μ: 0,70" },
  { id: "static-vehicle", label: "Vehículos estáticos", group: "Objetos duros o rígidos", detail: "Vehículos estacionados, detenidos o abandonados en calzada o arcén.", icon: "car", tone: "vehicle", defaults: "Masa: 1.400 kg · μ: 0,75" },
  { id: "human-body", label: "Cuerpos humanos", group: "Objetos o cuerpos blandos", detail: "Peatones, ciclistas, motociclistas u ocupantes de vehículos.", icon: "person", tone: "biological", defaults: "Masa: 75 kg · μ: 0,50" },
  { id: "animal-body", label: "Cuerpos animales", group: "Objetos o cuerpos blandos", detail: "Fauna silvestre o ganado.", icon: "paw", tone: "biological", defaults: "Masa: 60 kg · μ: 0,45" },
  { id: "blood", label: "Sangre", group: "Evidencia biológica", detail: "Manchas, proyecciones y patrones de sangre.", icon: "droplet", tone: "biological", defaults: "Estado: líquido · Registro fotográfico" },
  { id: "tissues", label: "Tejidos y restos corporales", group: "Evidencia biológica", detail: "Restos orgánicos y tejidos separados del cuerpo.", icon: "person", tone: "biological", defaults: "Estado: sólido · Muestra etiquetada" },
  { id: "tire-tracks", label: "Huellas de neumático", group: "Evidencia física", detail: "Marcas de frenado, arrastre, derrape, aceleración o rodadura.", icon: "route", tone: "physical", defaults: "μ: 0,70 · Longitud: 8 m" },
  { id: "pavement-traces", label: "Marcas y trazas de pavimento", group: "Evidencia física", detail: "Arañazos, rozaduras, surcos, excavaciones y baches.", icon: "warning", tone: "physical", defaults: "Profundidad: 0,02 m · Superficie" },
  { id: "fragments", label: "Fragmentos y autopartes", group: "Evidencia física", detail: "Plásticos, fibras, molduras, parachoques y piezas mecánicas.", icon: "box", tone: "physical", defaults: "Masa: 2 kg · Origen: por identificar" },
  { id: "glass", label: "Vidrios y restos de ventanas", group: "Evidencia física", detail: "Dispersión de vidrio laminado o templado de parabrisas, lunas o faros.", icon: "glass", tone: "physical", defaults: "Tipo: templado · Dispersión: 4 m" },
  { id: "fluids", label: "Fluidos y aceites", group: "Evidencia física", detail: "Aceite motor, líquido de frenos, refrigerante o combustible.", icon: "droplet", tone: "physical", defaults: "Tipo: combustible · Área: 2,4 m²" },
  { id: "sedan", label: "Sedán / Saloon", group: "Turismos y ligeros", detail: "Turismo de tres volúmenes.", icon: "car", tone: "vehicle", defaults: "Masa: 1.400 kg · Dim.: 4,5 × 1,8 m" },
  { id: "coupe", label: "Coupé", group: "Turismos y ligeros", detail: "Turismo de dos puertas.", icon: "car", tone: "vehicle", defaults: "Masa: 1.350 kg · Dim.: 4,4 × 1,9 m" },
  { id: "utility", label: "Utility / Micro", group: "Turismos y ligeros", detail: "Vehículo compacto y utilitario.", icon: "car", tone: "vehicle", defaults: "Masa: 950 kg · Dim.: 3,7 × 1,7 m" },
  { id: "mpv-suv", label: "MPV / SUV / 4x4", group: "Turismos y ligeros", detail: "Monovolumen, todoterreno o SUV.", icon: "car", tone: "vehicle", defaults: "Masa: 1.900 kg · μ: 0,78" },
  { id: "commercial", label: "Vans y pick-ups", group: "Comerciales, industriales y carga", detail: "Vehículos comerciales ligeros.", icon: "truck", tone: "vehicle", defaults: "Masa: 2.400 kg · Dim.: 5,4 × 2,0 m" },
  { id: "truck", label: "Camiones rígidos", group: "Comerciales, industriales y carga", detail: "Configuraciones 4x2, 6x4, 8x4 y similares.", icon: "truck", tone: "vehicle", defaults: "Masa: 12.000 kg · μ: 0,65" },
  { id: "trailer", label: "Tractora / Remolque", group: "Comerciales, industriales y carga", detail: "Tractocamiones, trenes de carretera, remolques y semirremolques.", icon: "truck", tone: "vehicle", defaults: "Masa: 32.000 kg · Dim.: 16,5 m" },
  { id: "bus", label: "Minibús / Autobús", group: "Transporte de pasajeros", detail: "Autobús estándar, urbano, autocar o articulado.", icon: "truck", tone: "vehicle", defaults: "Masa: 11.000 kg · Ocupantes: 45" },
  { id: "motorcycle", label: "Motocicleta / Ciclomotor", group: "Motocicletas y ciclomotores", detail: "Carretera (touring, sport, custom), off-road (motocross, enduro), trail, scooter y ciclomotor.", icon: "motorcycle", tone: "vehicle", defaults: "Masa: 210 kg · μ: 0,80" },
  { id: "other-vehicle", label: "Maquinaria y otros vehículos", group: "Otros vehículos", detail: "Maquinaria agrícola o de obras, bicicletas y carros de tracción animal.", icon: "tractor", tone: "vehicle", defaults: "Masa: 500 kg · μ: 0,60" },
];

function CatalogPanel({
  selectedTool,
  onSelect,
}: {
  selectedTool: string;
  onSelect: (item: CatalogItem) => void;
}) {
  const [tab, setTab] = useState<CatalogTab>("objects");
  const [query, setQuery] = useState("");
  const tabItems = catalogItems.filter((item) => {
    if (tab === "objects") return item.id.includes("body") || item.id.includes("object") || item.id === "road-infrastructure" || item.id === "static-vehicle";
    if (tab === "evidence") return item.group.startsWith("Evidencia");
    return item.tone === "vehicle" && !["static-vehicle"].includes(item.id);
  });
  const filtered = tabItems.filter((item) => `${item.label} ${item.group} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  const groups = [...new Set(filtered.map((item) => item.group))];

  return (
    <aside className="catalog-pane">
      <div className="catalog-header">
        <div>
          <span className="eyebrow">BIBLIOTECA DE ESCENA</span>
          <h2>Elementos y evidencias</h2>
          <p>Arrastra o selecciona una plantilla para inyectarla en la escena.</p>
        </div>
        <span className="catalog-count">{filtered.length}</span>
      </div>
      <div className="catalog-tabs" role="tablist" aria-label="Categorías del catálogo">
        {([
          ["objects", "Objetos", "wall"],
          ["evidence", "Evidencia", "droplet"],
          ["vehicles", "Vehículos", "car"],
        ] as const).map(([value, label, icon]) => (
          <Button className={`catalog-tab ${tab === value ? "is-active" : ""}`} key={value} onClick={() => setTab(value)} role="tab">
            <Icon name={icon} size={16} />
            {label}
          </Button>
        ))}
      </div>
      <label className="catalog-search">
        <Search aria-hidden="true" className="icon" size={16} />
        <input aria-label="Buscar en el catálogo" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar elemento..." value={query} />
        <kbd>⌘K</kbd>
      </label>
      <div className="catalog-list">
        {groups.map((group) => (
          <section className="catalog-group" key={group}>
            <div className="catalog-group-title">{group}</div>
            {filtered.filter((item) => item.group === group).map((item) => (
              <Button className={`catalog-item ${selectedTool === item.label ? "is-selected" : ""}`} key={item.id} onClick={() => onSelect(item)}>
                <span className={`catalog-icon tone-${item.tone}`}><Icon name={item.icon} size={19} /></span>
                <span className="catalog-item-copy"><b>{item.label}</b><small>{item.detail}</small><em>{item.defaults}</em></span>
                <ArrowRight aria-hidden="true" className="icon" size={15} />
              </Button>
            ))}
          </section>
        ))}
        {filtered.length === 0 && <div className="catalog-empty"><Search aria-hidden="true" className="icon" size={22} /><b>Sin resultados</b><span>Prueba con otro término.</span></div>}
      </div>
      <div className="catalog-footer"><Sparkles aria-hidden="true" className="icon" size={15} /><span>Las propiedades base quedan listas para cálculo físico.</span></div>
    </aside>
  );
}

function App() {
  const [ribbon, setRibbon] = useState<string>("Elementos");
  const [selectedTool, setSelectedTool] = useState("Infraestructura vial fija");
  const [selectedFrame, setSelectedFrame] = useState(2);
  const [frames, setFrames] = useState(frameNames);
  const [playing, setPlaying] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [zoom, setZoom] = useState(72);
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
    }
    setEditingIndex(null);
  };

  const addFrame = () => {
    const name = `Escena ${frames.length + 1}`;
    setFrames((current) => [...current, name]);
    setSelectedFrame(frames.length);
    skipCommit.current = false;
    setDraftName(name);
    setEditingIndex(frames.length); // abre el campo para nombrarla de inmediato
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    setEditingIndex(null);
    setFrames((current) => current.filter((_, index) => index !== selectedFrame));
    setSelectedFrame((current) => Math.max(0, current - 1));
  };

  const sendMessage = () => {
    if (!chatText.trim()) return;
    setMessages((current) => [...current, chatText.trim()]);
    setChatText("");
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
            <div className="map-block block-a" />
            <div className="map-block block-b" />
            <div className="map-block block-c" />
            <div className="map-block block-d" />
            <div className="map-park park-a">
              <span />
              <span />
              <span />
            </div>
            <svg className="roads" preserveAspectRatio="none" viewBox="0 0 1000 560">
              <path className="road-outer" d="M-30 470C160 390 240 300 408 260S660 230 1030 24" />
              <path className="road-inner" d="M-30 470C160 390 240 300 408 260S660 230 1030 24" />
              <path className="road-line" d="M-30 470C160 390 240 300 408 260S660 230 1030 24" />
              <path className="cross-road-outer" d="M245-30c-5 170 35 260 150 350s200 120 260 270" />
              <path className="cross-road-inner" d="M245-30c-5 170 35 260 150 350s200 120 260 270" />
              <path className="cross-road-line" d="M245-30c-5 170 35 260 150 350s200 120 260 270" />
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
            <div className="map-vehicle vehicle-a selected-object">
              <Icon name="car" size={27} />
              <span className="direction-line" />
              <b>V1</b>
            </div>
            <div className="map-vehicle vehicle-b">
              <Icon name="car" size={27} />
              <b>V2</b>
            </div>
            <div className="impact-marker">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="evidence-marker evidence-one">E1</div>
            <div className="evidence-marker evidence-two">E2</div>

            <div className="map-toolbar">
              <Button className="map-tool is-active" title="Seleccionar">
                <span className="cursor-arrow">↖</span>
              </Button>
              <Button className="map-tool" title="Mover mapa">
                <Icon name="map" size={17} />
              </Button>
              <Button className="map-tool" title="Medir">
                <span className="ruler-icon">⌁</span>
              </Button>
            </div>
            <div className="zoom-controls">
              <Button className="map-tool" onClick={() => setZoom((value) => Math.min(100, value + 8))}>
                <Icon name="plus" size={16} />
              </Button>
              <span>{zoom}%</span>
              <Button className="map-tool" onClick={() => setZoom((value) => Math.max(32, value - 8))}>
                <Icon name="minus" size={16} />
              </Button>
            </div>
            <div className="north-indicator">
              <span>N</span>
              <i />
            </div>

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

        {ribbon === "Elementos" ? (
          <CatalogPanel
            onSelect={(item) => setSelectedTool(item.label)}
            selectedTool={selectedTool}
          />
        ) : (
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
        )}
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