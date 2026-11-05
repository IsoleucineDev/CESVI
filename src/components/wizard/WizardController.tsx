import StepInicio from "./StepInicio"
import StepAproximacion from "./StepAproximacion"
import StepImpacto from "./StepImpacto"
import StepPosicionFinal from "./StepPosicionFinal"
import type { useWizard } from "../../hooks/useWizard"
import type { useScenarioItems } from "../../hooks/useScenarioItems"
import type { GeoPosition } from "../../lib/geo"

type WizardControllerProps = {
  wizard: ReturnType<typeof useWizard>
  scenario: ReturnType<typeof useScenarioItems>
  anchor: GeoPosition
  locationQuery: string
  onSearchEnter: (query: string) => void
  isSearching: boolean
  onExportReport: () => void
  onSetFeedback: (msg: string) => void
  isPlacingOnMap: boolean
  setIsPlacingOnMap: (val: boolean) => void
  isDrawingTrajectory: boolean
  setIsDrawingTrajectory: (val: boolean) => void
}

export default function WizardController({
  wizard,
  scenario,
  anchor,
  locationQuery,
  onSearchEnter,
  isSearching,
  onExportReport,
  onSetFeedback,
  isPlacingOnMap,
  setIsPlacingOnMap,
  isDrawingTrajectory,
  setIsDrawingTrajectory,
}: WizardControllerProps) {
  const { wizardState, advanceStep, goToStep } = wizard

  // Acciones Escena 01
  const handleConfirmLocation = () => {
    advanceStep()
    onSetFeedback("¡Ubicación confirmada! Desbloqueando Escena 02: Aproximación.")
  }

  // Acciones Escena 02
  const handleUpdateDraft = (updates: any) => {
    wizard.setVehicleDraft((prev) => ({ ...prev, ...updates }))
  }

  const handleSaveVehicle = () => {
    const id = wizard.currentVehicleId
    const draft = wizard.vehicleDraft
    scenario.upsertVehicle(id, {
      type: draft.type ?? "Automóvil",
      model: draft.model,
      direction: draft.direction ?? "NE",
      speed: draft.speed ?? 45,
      rotation:
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
                      : 315,
    })
    onSetFeedback(`${id} registrado correctamente`)
    wizard.setScene02Substep("ask_another")
  }

  const handleAddNextVehicle = () => {
    const existingCount = Object.keys(scenario.mapVehicles).length
    const nextId = `V${existingCount + 1}`
    wizard.setCurrentVehicleId(nextId)
    wizard.setVehicleDraft({
      id: nextId,
      type: "Automóvil",
      speed: 40,
      direction: "SO",
    })
    wizard.setScene02Substep("type")
  }

  const handleFinishVehicles = () => {
    advanceStep()
    onSetFeedback("¡Vehículos registrados! Desbloqueando Escena 03: Impacto.")
  }

  const handleDeleteVehicle = (id: string) => {
    scenario.removeVehicle(id)
    onSetFeedback(`${id} eliminado del siniestro`)
  }

  // Acciones Escena 03
  const handleToggleImpactVehicle = (vehicleId: string) => {
    wizard.setImpactVehicles((current) => {
      if (current.includes(vehicleId)) {
        return current.filter((v) => v !== vehicleId)
      }
      return [...current, vehicleId]
    })
  }

  const handleSetImpactZone = (vehicleId: string, zone: string) => {
    wizard.setImpactZones((prev) => ({ ...prev, [vehicleId]: zone }))
    scenario.upsertVehicle(vehicleId, { impactZone: zone })
    onSetFeedback(`Zona de impacto para ${vehicleId}: ${zone}`)
  }

  const handleFinishImpact = () => {
    advanceStep()
    onSetFeedback("¡Dinámica de impacto confirmada! Desbloqueando Escena 04: Posición Final.")
  }

  const handleAddEvidence = () => {
    scenario.addCatalogItem("Evidencia pericial", "object")
    onSetFeedback("Evidencia agregada · Arrastra para ubicarla en el mapa")
  }

  const handleAddSignal = () => {
    scenario.addCatalogItem("Señalización", "object")
    onSetFeedback("Señal agregada · Arrastra para posicionarla")
  }

  const handleStartMeasure = () => {
    onSetFeedback("Herramienta de medición activada · Haz clic en el mapa")
  }

  // Acciones Escena 04
  const handleFinalize = () => {
    advanceStep()
    onSetFeedback("🎉 ¡Reconstrucción pericial completada al 100%! Puedes exportar el informe.")
  }

  return (
    <div className="wizard-controller">
      {wizardState.step === "inicio" && (
        <StepInicio
          locationQuery={locationQuery}
          anchor={anchor}
          substep={wizard.scene01Substep}
          onSetSubstep={wizard.setScene01Substep}
          onConfirmLocation={handleConfirmLocation}
          onSearchEnter={onSearchEnter}
          isSearching={isSearching}
        />
      )}

      {wizardState.step === "aproximacion" && (
        <StepAproximacion
          currentVehicleId={wizard.currentVehicleId}
          substep={wizard.scene02Substep}
          draft={wizard.vehicleDraft}
          vehicles={scenario.mapVehicles}
          onSetSubstep={wizard.setScene02Substep}
          onUpdateDraft={handleUpdateDraft}
          onSaveVehicle={handleSaveVehicle}
          onAddNextVehicle={handleAddNextVehicle}
          onFinishVehicles={handleFinishVehicles}
          onStartTrajectoryMode={() => setIsDrawingTrajectory(!isDrawingTrajectory)}
          onSkipTrajectory={() => wizard.setScene02Substep("ask_another")}
          onDeleteVehicle={handleDeleteVehicle}
          isPlacingOnMap={isPlacingOnMap}
          isDrawingTrajectory={isDrawingTrajectory}
        />
      )}

      {wizardState.step === "impacto" && (
        <StepImpacto
          substep={wizard.scene03Substep}
          vehicles={scenario.mapVehicles}
          impactVehicles={wizard.impactVehicles}
          impactPosition={scenario.impactPosition}
          impactTime={wizard.impactTime}
          impactZones={wizard.impactZones}
          onSetSubstep={wizard.setScene03Substep}
          onToggleImpactVehicle={handleToggleImpactVehicle}
          onSetImpactZone={handleSetImpactZone}
          onSetImpactTime={wizard.setImpactTime}
          onFinishImpact={handleFinishImpact}
          onAddEvidence={handleAddEvidence}
          onAddSignal={handleAddSignal}
          onStartMeasure={handleStartMeasure}
          isPlacingImpact={isPlacingOnMap}
        />
      )}

      {wizardState.step === "posicion_final" && (
        <StepPosicionFinal
          vehicles={scenario.mapVehicles}
          isComplete={wizardState.isComplete}
          onFinalize={handleFinalize}
          onExportReport={onExportReport}
        />
      )}
    </div>
  )
}
