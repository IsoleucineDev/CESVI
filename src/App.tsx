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

import { useLocationSearch } from "./hooks/useLocationSearch"
import { useScenarioItems } from "./hooks/useScenarioItems"
import { useTimelinePlayback } from "./hooks/useTimelinePlayback"

import { api, type CaseContext, type Scene } from "./lib/api"
import {
  DEFAULT_MAP_CENTER,
  IMPACT_POSITION,
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

  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const [currentZoom, setCurrentZoom] = useState(19)
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER)

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
  } = useLocationSearch("Av. Paseo de la Reforma 222")

  const scenario = useScenarioItems()

  const handleDeleteSelected = useCallback(() => {
    if (scenario.selectedDroppedId) {
      scenario.setDroppedItems((current) => {
        const found = current.find((item) => item.id === scenario.selectedDroppedId) ?? null
        if (found) scenario.undoLastItem()
        return current.filter((item) => item.id !== scenario.selectedDroppedId)
      })
      scenario.setSelectedDroppedId(null)
      setFeedback("Elemento eliminado · Puedes usar Rehacer")
    }
  }, [scenario])

  const timeline = useTimelinePlayback({ onDeleteSelected: handleDeleteSelected })

  const activeTools = ribbonGroups[ribbon] || ribbonGroups.Mapeo
  const mapViewMode = timeline.selectedFrame === 0 ? "location" : "scenario"
  const mapViewCenter: [number, number] =
    mapViewMode === "location" ? mapCenter : [IMPACT_POSITION.lat, IMPACT_POSITION.lng]
  const mapViewZoom = mapViewMode === "location" ? 15 : 19

  const assistantContext = useMemo(
    () => ({
      case: caseContext,
      scene: timeline.frames[timeline.selectedFrame],
      selectedTool,
      selectedFrame: timeline.selectedFrame,
      droppedItems: scenario.droppedItems,
      vehicles: scenario.mapVehicles,
    }),
    [
      caseContext,
      timeline.frames,
      timeline.selectedFrame,
      selectedTool,
      scenario.droppedItems,
      scenario.mapVehicles,
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
    const timer = window.setTimeout(() => setFeedback(""), 2200)
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

    const center = mapInstance ? mapInstance.getCenter() : { lat: DEFAULT_MAP_CENTER[0], lng: DEFAULT_MAP_CENTER[1] }
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
    const report = [
      "CESVI · Reconstrucción vial",
      "Expediente: EXP-0248",
      `Escenas: ${timeline.frames.length}`,
      `Elementos colocados: ${scenario.droppedItems.length}`,
      ...scenario.droppedItems.map((item) => `- ${item.label} (${item.kind})`),
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

  const handleCreateNewCase = () => {
    scenario.resetItems()
    timeline.setFrames(["Inicio", "Aproximación", "Impacto", "Posición final"])
    timeline.setSelectedFrame(0)
    setShowDashboard(false)
    setFeedback("Nuevo expediente preparado")
  }

  const handleSelectLocationSuggestion = (suggestion: LocationSuggestion) => {
    setLocationQuery(suggestion.display_name)
    setMapCenter([Number(suggestion.lat), Number(suggestion.lon)])
    setLocationSuggestions([])
  }

  return (
    <main className="app-shell" aria-busy={dataLoading}>
      <ErrorBoundary fallbackTitle="Error en la barra de navegación">
        <TopBar
          onOpenDashboard={() => setShowDashboard(true)}
          ribbon={ribbon}
          openMenu={openMenu}
          onSelectRibbon={selectRibbon}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExportReport={handleExportReport}
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
          onSearchEnter={(val) => {
            const first = locationSuggestions[0]
            if (first) {
              handleSelectLocationSuggestion(first)
            } else {
              setFeedback(`Ubicación buscada: ${val}`)
            }
          }}
        />
      </ErrorBoundary>

      <div className="workspace">
        <section className="editor-pane">
          <ErrorBoundary fallbackTitle="Error en las pestañas de escena">
            <SceneTabs
              frames={timeline.frames}
              selectedFrame={timeline.selectedFrame}
              onSelectFrame={timeline.setSelectedFrame}
              onAddFrame={timeline.addFrame}
            />
          </ErrorBoundary>

          <ErrorBoundary fallbackTitle="Error en el mapa interactivo">
            <MapCanvas
              mapMode={mapMode}
              onSelectMapMode={(m) => {
                setMapMode(m)
                if (m === "select" || m === "pan") mapInstance?.dragging.enable()
              }}
              mapTheme={mapTheme}
              mapViewMode={mapViewMode}
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
              inspectorOpen={inspectorOpen}
              onCloseInspector={() => setInspectorOpen(false)}
              onOpenInspector={() => setInspectorOpen(true)}
            />
          </ErrorBoundary>

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
        </section>

        <ErrorBoundary fallbackTitle="Error en el asistente pericial">
          <AssistantPanel
            context={assistantContext}
            onShowProperties={() => setInspectorOpen(true)}
            onAttachFile={(name) => setFeedback(`${name} adjuntado al expediente`)}
          />
        </ErrorBoundary>
      </div>

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
