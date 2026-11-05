import { useCallback, useEffect, useMemo, useState } from "react"
import {
  calculateProgress,
  completeCurrentStep,
  INITIAL_WIZARD_STATE,
  jumpToStepDebug as machineJumpToStepDebug,
  sanitizeWizardState,
  stepToIndex,
  transitionTo,
  type WizardState,
  type WizardStep,
} from "../lib/wizardMachine"
import { DEFAULT_CASE_ID, loadSavedCase, saveCase } from "../lib/migration"
import type { GeoPosition } from "../lib/geo"

export type VehicleDraft = {
  id: string
  type: string
  model?: string
  direction?: string
  speed?: number
  lat?: number
  lng?: number
  trajectoryPoints?: Array<{ x: number; y: number }>
}

export type Scene01Substep = "ask_address" | "confirm_address" | "adjust_pin"
export type Scene02Substep =
  | "type"
  | "model"
  | "direction"
  | "speed"
  | "place"
  | "trajectory"
  | "ask_another"
export type Scene03Substep =
  | "place_impact"
  | "select_vehicles"
  | "impact_zones"
  | "ask_more"
  | "add_evidence"
  | "add_signal"
  | "measure"
export type Scene04Substep = "adjust_positions" | "completed"

export function useWizard(
  anchor: GeoPosition,
  locationQuery: string,
  caseId = DEFAULT_CASE_ID,
) {
  const savedCase = typeof window !== "undefined" ? loadSavedCase(caseId) : null

  const [wizardState, setWizardState] = useState<WizardState>(() => {
    return savedCase?.wizard
      ? sanitizeWizardState(savedCase.wizard)
      : { ...INITIAL_WIZARD_STATE }
  })

  // Subestados específicos por escena
  const [scene01Substep, setScene01Substep] = useState<Scene01Substep>(() => {
    if (savedCase?.wizard?.completedSteps.includes("inicio")) return "confirm_address"
    return "ask_address"
  })

  const [currentVehicleId, setCurrentVehicleId] = useState<string>("V1")
  const [scene02Substep, setScene02Substep] = useState<Scene02Substep>("type")
  const [vehicleDraft, setVehicleDraft] = useState<Partial<VehicleDraft>>({
    id: "V1",
    type: "Automóvil",
    speed: 45,
    direction: "NE",
  })

  const [scene03Substep, setScene03Substep] = useState<Scene03Substep>("place_impact")
  const [impactVehicles, setImpactVehicles] = useState<string[]>(() => {
    return savedCase?.impactVehicles ?? ["V1", "V2"]
  })
  const [impactTime, setImpactTime] = useState<string>(() => {
    return savedCase?.impactTime ?? "00:03.38"
  })
  const [impactZones, setImpactZones] = useState<Record<string, string>>({})

  const [scene04Substep, setScene04Substep] = useState<Scene04Substep>(() => {
    return wizardState.isComplete ? "completed" : "adjust_positions"
  })

  const progress = useMemo(() => calculateProgress(wizardState), [wizardState])
  const activeSceneIndex = useMemo(() => stepToIndex(wizardState.step), [wizardState.step])

  // Guardar en localStorage cuando cambia wizardState
  useEffect(() => {
    const existing = loadSavedCase(caseId)
    if (existing) {
      saveCase(
        {
          ...existing,
          wizard: wizardState,
          impactVehicles,
          impactTime,
        },
        caseId,
      )
    } else {
      saveCase(
        {
          version: 2,
          anchor,
          locationQuery,
          vehicles: {},
          impact: { x: 0, y: 0 },
          evidence: [],
          droppedItems: [],
          wizard: wizardState,
          impactVehicles,
          impactTime,
          savedAt: new Date().toISOString(),
        },
        caseId,
      )
    }
  }, [wizardState, impactVehicles, impactTime, caseId, anchor, locationQuery])

  const goToStep = useCallback((targetStep: WizardStep) => {
    setWizardState((current) => transitionTo(current, targetStep))
  }, [])

  const advanceStep = useCallback(() => {
    setWizardState((current) => completeCurrentStep(current))
  }, [])

  const jumpToStep = useCallback((targetStep: WizardStep) => {
    setWizardState((current) => machineJumpToStepDebug(current, targetStep))
  }, [])

  const restartWizard = useCallback(() => {
    setWizardState({ ...INITIAL_WIZARD_STATE })
    setScene01Substep("ask_address")
    setCurrentVehicleId("V1")
    setScene02Substep("type")
    setScene03Substep("place_impact")
    setScene04Substep("adjust_positions")
  }, [])

  return {
    wizardState,
    setWizardState,
    progress,
    activeSceneIndex,
    goToStep,
    advanceStep,
    jumpToStep,
    restartWizard,

    // Escena 01
    scene01Substep,
    setScene01Substep,

    // Escena 02
    currentVehicleId,
    setCurrentVehicleId,
    scene02Substep,
    setScene02Substep,
    vehicleDraft,
    setVehicleDraft,

    // Escena 03
    scene03Substep,
    setScene03Substep,
    impactVehicles,
    setImpactVehicles,
    impactTime,
    setImpactTime,
    impactZones,
    setImpactZones,

    // Escena 04
    scene04Substep,
    setScene04Substep,
  }
}
