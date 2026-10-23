import { useCallback, useEffect, useMemo, useState } from "react"
import type { Map as LeafletMap } from "leaflet"
import "leaflet/dist/leaflet.css"

import TopBar from "./components/layout/TopBar"
import AssistantPanel from "./components/assistant/AssistantPanel"
import ErrorBoundary from "./components/common/ErrorBoundary"
import CatalogMenu from "./components/catalog/CatalogMenu"
import Dashboard from "./components/dashboard/Dashboard"
import RibbonBar from "./components/ribbon/RibbonBar"
import SceneTabs from "./components/timeline/SceneTabs"
import Timeline from "./components/timeline/Timeline"
import MapCanvas from "./components/map/MapCanvas"
import DebugPanel from "./components/common/DebugPanel"

import { useLocationSearch } from "./hooks/useLocationSearch"
import { useScenarioItems } from "./hooks/useScenarioItems"
import { useTimelinePlayback } from "./hooks/useTimelinePlayback"

import { api, type CaseContext, type Scene } from "./lib/api"
import { DEFAULT_ANCHOR, loadSavedCase } from "./lib/migration.ts"
import { toOffsetM, type GeoPosition } from "./lib/geo.ts"
import { useWizard } from "./hooks/useWizard"
import WizardController from "./components/wizard/WizardController"
import CoachMarks from "./components/wizard/CoachMarks"
import { indexToStep, STEP_LABELS, type WizardStep } from "./lib/wizardMachine"
import { exportUnityJson } from "./lib/exportUnity"
import { buildReportPdf } from "./lib/exportPdf.ts"
import {
  type DroppedItem,
  type LocationSuggestion,
  type MenuKey,
  ribbonGroups,
} from "./types/scenario"

export default function App() {
  const [ribbon, setRibbon] = useState<string>("Mapeo")
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [selectedTool, setSelectedTool] = useState("Mapa base")
  const [showDashboard, setShowDashboard] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mapMode, setMapMode] = useState<"select" | "pan" | "measure">("select")
  const [mapTheme, setMapTheme] = useState<"base" | "technical">("base")
  const [feedback, setFeedback] = useState("")

  // Estado único y fuente única de verdad para la ubicación geográfica
  const savedCase = typeof window !== "undefined" ? loadSavedCase() : null
  const [anchor, setAnchor] = useState<GeoPosition>(() => savedCase?.anchor ?? DEFAULT_ANCHOR)
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => [anchor.lat, anchor.lng])

  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const [currentZoom, setCurrentZoom] = useState(19)

  const [caseContext, setCaseContext] = useState<CaseContext | null>(null)
  const [, setSceneRecords] = useState<Scene[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Hooks extraídos
  const {
    locationQuery,
    setLocationQuery,
    locationSuggestions,
    setLocationSuggestions,
    locationSearchLoading,
    searchAddress,
  } = useLocationSearch(savedCase?.locationQuery ?? "Plaza de la Constitución, Zócalo CDMX")

  // Modelo relativo de elementos vinculado al ancla única
  const scenario = useScenarioItems(anchor, locationQuery)

  // Flujo guiado por pasos (Wizard pericial)
  const wizard = useWizard(anchor, locationQuery)
  const isInicio = wizard.wizardState.step === "inicio"
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false)
  const [isDrawingTrajectory, setIsDrawingTrajectory] = useState(false)

<<<<<<< HEAD
  const handleDeleteSelected = useCallback(() => {
    if (scenario.selectedDroppedId) {
      scenario.setDroppedItems((current) => {
        const found = current.find((item) => item.id === scenario.selectedDroppedId) ?? null
        if (found) scenario.undoLastItem()
        return current.filter((item) => item.id !== scenario.selectedDroppedId)
=======
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
        const nextLatLng = map.containerPointToLatLng(correctedPoint);
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
    return () => {
      map.off("zoomend", update);
    };
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
>>>>>>> 10d39de (Add serverless backend for case scenes and assistant)
      })
      scenario.setSelectedDroppedId(null)
      setFeedback("Elemento eliminado · Puedes usar Rehacer")
    }
  }, [scenario])

  const timeline = useTimelinePlayback({ onDeleteSelected: handleDeleteSelected })

  // Sincronizar frame de timeline con el paso del wizard
  useEffect(() => {
    if (timeline.selectedFrame !== wizard.activeSceneIndex) {
      timeline.setSelectedFrame(wizard.activeSceneIndex)
    }
  }, [wizard.activeSceneIndex, timeline])

  const activeTools = ribbonGroups[ribbon] || ribbonGroups.Mapeo
  const mapViewMode = timeline.selectedFrame === 0 ? "location" : "scenario"
  // Única fuente de verdad: ninguna escena tiene center propio
  const mapViewCenter: [number, number] = [anchor.lat, anchor.lng]
  const mapViewZoom = mapViewMode === "location" ? 16 : 19

  // Cambio de pestaña: invalidar tamaño y setView con el ancla actual
  useEffect(() => {
    if (!mapInstance) return
    mapInstance.invalidateSize()
    mapInstance.setView([anchor.lat, anchor.lng], mapViewZoom)
    setCurrentZoom(mapViewZoom)
  }, [timeline.selectedFrame, mapInstance, anchor, mapViewZoom])

  const assistantContext = useMemo(
    () => ({
      case: caseContext,
      scene: timeline.frames[timeline.selectedFrame],
      selectedTool,
      selectedFrame: timeline.selectedFrame,
      droppedItems: scenario.droppedItems,
      vehicles: scenario.mapVehicles,
      selectedVehicleId: scenario.selectedVehicleId,
      selectedDroppedId: scenario.selectedDroppedId,
      anchor,
    }),
    [
      caseContext,
      timeline.frames,
      timeline.selectedFrame,
      selectedTool,
      scenario.droppedItems,
      scenario.mapVehicles,
      scenario.selectedVehicleId,
      scenario.selectedDroppedId,
      anchor,
    ],
  )

  // Carga inicial de datos
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
          timeline.setFrames(ordered.map((scene) => scene.name))
          timeline.setSelectedFrame((current) => Math.min(current, ordered.length - 1))
        }
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Auto-cierre de feedback
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(""), 3500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const selectRibbon = (tab: string) => {
    if (!(tab in ribbonGroups)) {
      setOpenMenu(null)
      if (tab === "Archivo") setShowDashboard(true)
      if (tab === "Vista") {
        if (mapInstance) {
          mapInstance.setView(mapViewCenter, mapViewZoom)
          setCurrentZoom(mapViewZoom)
        }
        setFeedback("Vista del mapa restablecida")
      }
      return
    }

    setRibbon(tab)
    setSelectedTool(ribbonGroups[tab][0].label)
    setOpenMenu(
      tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
        ? openMenu === tab
          ? null
          : (tab as MenuKey)
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

    const center = mapInstance
      ? mapInstance.getCenter()
      : { lat: anchor.lat, lng: anchor.lng }
    scenario.addCatalogItem(item, kind, center)
    setFeedback(`${item} agregado al mapa · Arrastra para moverlo`)
  }

  const handleUndo = () => {
    const removed = scenario.undoLastItem()
    if (!removed) {
      setFeedback("No hay acciones para deshacer")
    } else {
      setFeedback(`${removed.label} retirado del mapa`)
    }
  }

  const handleRedo = () => {
    const restored = scenario.redoLastItem()
    if (!restored) {
      setFeedback("No hay acciones para rehacer")
    } else {
      setFeedback(`${restored.label} restaurado`)
    }
  }

  const handleExportReport = () => {
    buildReportPdf({
      caseId: "EXP-0248",
      anchor,
      locationQuery,
      vehicles: scenario.mapVehicles,
      impactPosition: scenario.impactPosition,
      impactVehicles: wizard.impactVehicles,
      impactTime: wizard.impactTime,
      impactZones: wizard.impactZones,
      evidencePositions: scenario.evidencePositions,
      droppedItems: scenario.droppedItems,
      wizardState: wizard.wizardState,
    })
    setFeedback("Informe pericial EXP-0248 (PDF) descargado con éxito")
  }

  const handleExportUnity = () => {
    exportUnityJson({
      caseId: "EXP-0248",
      anchor,
      locationQuery,
      vehicles: scenario.mapVehicles,
      impact: scenario.impactPosition,
      evidence: scenario.evidencePositions,
      droppedItems: scenario.droppedItems,
    })
    setFeedback("Modelo de exportación EXP-0248 para Unity descargado con éxito")
  }

  const handleCreateNewCase = () => {
    scenario.resetItems()
    timeline.setFrames(["Inicio", "Aproximación", "Impacto", "Posición final"])
    timeline.setSelectedFrame(0)
    setShowDashboard(false)
    setFeedback("Nuevo expediente preparado")
  }

  // Flujo maestro de reubicación
  const handleRelocate = useCallback(
    (displayName: string, coords: GeoPosition) => {
      const lat = typeof coords.lat === "number" ? coords.lat : parseFloat(coords.lat as any)
      const lng = typeof coords.lng === "number" ? coords.lng : parseFloat(coords.lng as any)

      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        setFeedback("Error: Coordenadas geográficas no válidas")
        return
      }

      const newAnchor: GeoPosition = { lat, lng }
      setLocationQuery(displayName)
      setAnchor(newAnchor)
      setMapCenter([lat, lng])

      if (mapInstance) {
        mapInstance.flyTo([lat, lng], mapViewZoom, { duration: 0.8 })
      }

      // Reiniciar selección del panel derecho a "Sin selección" y timeline a 0
      scenario.setSelectedVehicleId("")
      scenario.setSelectedDroppedId(null)
      timeline.setPlaying(false)
      timeline.setSelectedFrame(0)

      // Si está en escena 01, solicitar confirmación de la nueva dirección
      if (wizard.wizardState.step === "inicio") {
        wizard.setScene01Substep("confirm_address")
      }

      // Toast requerido
      setFeedback(`Escena reubicada: ${displayName} (${lat.toFixed(5)}, ${lng.toFixed(5)})`)
    },
    [mapInstance, mapViewZoom, scenario, setLocationQuery, timeline, wizard],
  )

  const handleMoveAnchor = useCallback(
    (pos: GeoPosition) => {
      setAnchor(pos)
      setMapCenter([pos.lat, pos.lng])
      if (wizard.wizardState.step === "inicio") {
        wizard.setScene01Substep("confirm_address")
      }
    },
    [wizard],
  )

  const handleSelectFrame = useCallback(
    (frameIndex: number) => {
      const targetStep = indexToStep(frameIndex)
      if (wizard.wizardState.unlockedSteps.includes(targetStep)) {
        wizard.goToStep(targetStep)
        timeline.setSelectedFrame(frameIndex)
      } else {
        setFeedback(
          `Paso "${STEP_LABELS[targetStep]}" aún bloqueado. Completa el paso actual primero.`,
        )
      }
    },
    [wizard, timeline],
  )

  const handleDebugJump = useCallback(
    (step: WizardStep) => {
      wizard.jumpToStep(step)
      setFeedback(`[DEBUG] Saltando a ${STEP_LABELS[step]}`)
    },
    [wizard],
  )

  const handleMapClick = useCallback(
    (pos: GeoPosition) => {
      // Flujo Escena 02: Posicionamiento y trayectoria de vehículos
      if (wizard.wizardState.step === "aproximacion") {
        if (wizard.scene02Substep === "place") {
          const currentId = wizard.currentVehicleId
          const draft = wizard.vehicleDraft
          const rotation =
            draft.direction === "N"
              ? 0
              : draft.direction === "NE"
                ? 45
                : draft.direction === "E"
                  ? 90
                  : draft.direction === "SE"
                    ? 135
                    : draft.direction === "S"
                      ? 180
                      : draft.direction === "SO"
                        ? 225
                        : draft.direction === "O"
                          ? 270
                          : 315
          scenario.moveVehicle(currentId, pos)
          scenario.upsertVehicle(currentId, {
            type: draft.type ?? "Automóvil",
            model: draft.model,
            direction: draft.direction ?? "NE",
            speed: draft.speed ?? 45,
            rotation,
          })
          setFeedback(`${currentId} posicionado en el mapa`)
          wizard.setScene02Substep("trajectory")
          return
        }

        if (wizard.scene02Substep === "trajectory" && isDrawingTrajectory) {
          const currentId = wizard.currentVehicleId
          const v = scenario.mapVehicles[currentId]
          const currentTrajectory = v?.trajectoryPoints ?? []
          const offsetPt = toOffsetM(anchor, pos)
          scenario.upsertVehicle(currentId, {
            trajectoryPoints: [
              ...currentTrajectory,
              { x: offsetPt.x, y: offsetPt.y, lat: pos.lat, lng: pos.lng },
            ],
          })
          setFeedback(`Punto de trayectoria marcado para ${currentId}`)
          return
        }
      }

      // Flujo Escena 03: Posicionamiento de impacto y elementos periciales
      if (wizard.wizardState.step === "impacto") {
        if (wizard.scene03Substep === "place_impact") {
          scenario.moveImpact(pos)
          setFeedback(`Punto de impacto fijado en (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`)
          return
        }
        if (wizard.scene03Substep === "add_evidence") {
          const ev = scenario.addEvidenceMarker(undefined, pos)
          setFeedback(`Evidencia ${ev.label} fijada en el mapa`)
          return
        }
        if (wizard.scene03Substep === "add_signal") {
          scenario.addItem({ kind: "object", label: "Señal vial" }, pos)
          setFeedback("Señalización colocada en el mapa")
          return
        }
      }
    },
    [wizard, scenario, anchor, isDrawingTrajectory],
  )

  const handleSelectLocationSuggestion = (suggestion: LocationSuggestion) => {
    const lat = parseFloat(suggestion.lat)
    const lon = parseFloat(suggestion.lon)
    if (isNaN(lat) || isNaN(lon)) {
      setFeedback("Error al procesar coordenadas de la sugerencia seleccionada")
      return
    }
    handleRelocate(suggestion.display_name, { lat, lng: lon })
    setLocationSuggestions([])
  }

  return (
    <main className={`app-shell ${isInicio ? "is-wizard-inicio" : ""}`} aria-busy={dataLoading}>
      <ErrorBoundary fallbackTitle="Error en la barra de navegación">
        <TopBar
          onOpenDashboard={() => setShowDashboard(true)}
          ribbon={ribbon}
          openMenu={openMenu}
          onSelectRibbon={selectRibbon}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExportReport={handleExportReport}
          onExportUnity={handleExportUnity}
          exportDisabled={!wizard.wizardState.isComplete}
        >
          {openMenu && (
            <CatalogMenu
              menuKey={openMenu}
              onClose={() => setOpenMenu(null)}
              onSelect={selectCatalogItem}
            />
          )}
        </TopBar>
      </ErrorBoundary>

      {!isInicio && (
        <ErrorBoundary fallbackTitle="Error en la barra de herramientas">
          <RibbonBar
            ribbon={ribbon}
            activeTools={activeTools}
            selectedTool={selectedTool}
            onSelectTool={(tool) => {
              setSelectedTool(tool)
              setFeedback(`${tool} activado`)
            }}
            locationQuery={locationQuery}
            onChangeLocationQuery={setLocationQuery}
            locationSuggestions={locationSuggestions}
            locationSearchLoading={locationSearchLoading}
            onSelectLocationSuggestion={handleSelectLocationSuggestion}
            mapTheme={mapTheme}
            onToggleMapTheme={() => {
              const next = mapTheme === "base" ? "technical" : "base"
              setMapTheme(next)
              setFeedback(next === "base" ? "Mapa base activado" : "Mapa técnico activado")
            }}
            onAdjustScene={() => {
              if (mapInstance) {
                mapInstance.setView(mapViewCenter, mapViewZoom)
                setCurrentZoom(mapViewZoom)
              }
              setMapMode("select")
              setFeedback("Escena ajustada al viewport")
            }}
            onSearchEnter={async (val) => {
              const first = locationSuggestions[0]
              if (first) {
                handleSelectLocationSuggestion(first)
                return
              }
              const found = await searchAddress(val)
              if (found) {
                handleSelectLocationSuggestion(found)
              } else {
                setFeedback(`No se encontró la ubicación: "${val}". Verifique la dirección.`)
              }
            }}
          />
        </ErrorBoundary>
      )}

      <div className="workspace">
        <section className={`editor-pane ${isInicio ? "is-wizard-inicio" : ""}`}>
          {!isInicio && (
            <ErrorBoundary fallbackTitle="Error en las pestañas de escena">
              <SceneTabs
                frames={timeline.frames}
                selectedFrame={timeline.selectedFrame}
                onSelectFrame={handleSelectFrame}
                onAddFrame={timeline.addFrame}
              />
            </ErrorBoundary>
          )}

          <ErrorBoundary fallbackTitle="Error en el mapa interactivo">
            <MapCanvas
              mapMode={mapMode}
              onSelectMapMode={(m) => {
                setMapMode(m)
                if (m === "select" || m === "pan") mapInstance?.dragging.enable()
              }}
              mapTheme={mapTheme}
              mapViewMode={isInicio ? "location" : mapViewMode}
              mapViewCenter={mapViewCenter}
              mapViewZoom={mapViewZoom}
              mapCenter={mapCenter}
              mapInstance={mapInstance}
              onMapInit={setMapInstance}
              currentZoom={currentZoom}
              onZoomChange={setCurrentZoom}
              droppedItems={scenario.droppedItems}
              mapVehicles={scenario.mapVehicles}
              impactPosition={scenario.impactPosition}
              evidencePositions={scenario.evidencePositions}
              selectedDroppedId={scenario.selectedDroppedId}
              selectedVehicleId={scenario.selectedVehicleId}
              onDropItem={(item, pos) => {
                scenario.addItem(item, pos)
                setSelectedTool(item.label)
                setOpenMenu(null)
              }}
              onSelectDropped={(id) => {
                scenario.setSelectedDroppedId(id)
                scenario.setSelectedVehicleId("")
              }}
              onSelectVehicle={(id) => {
                scenario.setSelectedVehicleId(id)
                scenario.setSelectedDroppedId(null)
              }}
              onMoveDropped={scenario.moveDropped}
              onMoveVehicle={scenario.moveVehicle}
              onMoveImpact={scenario.moveImpact}
              onMoveEvidence={scenario.moveEvidence}
              onRotateDropped={scenario.rotateDropped}
              onRotateVehicle={scenario.rotateVehicle}
              onScaleDropped={scenario.scaleDropped}
              onScaleVehicle={scenario.scaleVehicle}
              onMoveAnchor={handleMoveAnchor}
              onMapClick={handleMapClick}
              inspectorOpen={!isInicio && inspectorOpen}
              onCloseInspector={() => setInspectorOpen(false)}
              onOpenInspector={() => setInspectorOpen(true)}
            />
          </ErrorBoundary>

          {!isInicio && (
            <ErrorBoundary fallbackTitle="Error en la línea de tiempo">
              <Timeline
                framesCount={timeline.frames.length}
                selectedFrame={timeline.selectedFrame}
                playing={timeline.playing}
                onTogglePlay={timeline.togglePlay}
                onPrevFrame={timeline.prevFrame}
                onNextFrame={timeline.nextFrame}
              />
            </ErrorBoundary>
          )}
        </section>

        <ErrorBoundary fallbackTitle="Error en el asistente pericial">
          <AssistantPanel
            context={assistantContext}
            wizard={wizard}
            wizardContent={
              <WizardController
                wizard={wizard}
                scenario={scenario}
                anchor={anchor}
                locationQuery={locationQuery}
                onSearchEnter={async (val) => {
                  const first = locationSuggestions[0]
                  if (first) {
                    handleSelectLocationSuggestion(first)
                    return
                  }
                  const found = await searchAddress(val)
                  if (found) {
                    handleSelectLocationSuggestion(found)
                  } else {
                    setFeedback(`No se encontró la ubicación: "${val}". Verifique la dirección.`)
                  }
                }}
                isSearching={locationSearchLoading}
                onExportReport={handleExportReport}
                onExportUnity={handleExportUnity}
                onSetFeedback={setFeedback}
                isPlacingOnMap={isPlacingOnMap}
                setIsPlacingOnMap={setIsPlacingOnMap}
                isDrawingTrajectory={isDrawingTrajectory}
                setIsDrawingTrajectory={setIsDrawingTrajectory}
                onToggleMeasure={() =>
                  setMapMode((m) => (m === "measure" ? "select" : "measure"))
                }
              />
            }
            onShowProperties={() => setInspectorOpen(true)}
            onAttachFile={(name) => setFeedback(`${name} adjuntado al expediente`)}
          />
        </ErrorBoundary>
      </div>

      <CoachMarks currentStep={wizard.wizardState.step} />

      <DebugPanel
        anchor={anchor}
        activeSceneIndex={timeline.selectedFrame}
        activeSceneName={timeline.frames[timeline.selectedFrame]}
        currentStep={wizard.wizardState.step}
        v1={scenario.mapVehicles.V1}
        v2={scenario.mapVehicles.V2}
        evidence={scenario.evidencePositions}
        onRelocate={handleRelocate}
        onJumpToStep={handleDebugJump}
      />

      {showDashboard && (
        <div
          className="dashboard-overlay"
          onMouseDown={() => setShowDashboard(false)}
        >
          <div onMouseDown={(event) => event.stopPropagation()}>
            <ErrorBoundary fallbackTitle="Error en el centro de casos">
              <Dashboard
                onClose={() => setShowDashboard(false)}
                onNewCase={handleCreateNewCase}
              />
            </ErrorBoundary>
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
