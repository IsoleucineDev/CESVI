/**
 * Máquina de estados finita para el flujo guiado (wizard conversacional) de CESVI.
 * Maneja transiciones ordenadas, desbloqueo progresivo y cálculo de progreso.
 */

export type WizardStep = "inicio" | "aproximacion" | "impacto" | "posicion_final"

export const WIZARD_STEPS: readonly WizardStep[] = [
  "inicio",
  "aproximacion",
  "impacto",
  "posicion_final",
] as const

export const STEP_LABELS: Record<WizardStep, string> = {
  inicio: "01 Inicio",
  aproximacion: "02 Aproximación",
  impacto: "03 Impacto",
  posicion_final: "04 Posición final",
}

export const STEP_FRAME_NAMES: Record<WizardStep, string> = {
  inicio: "Inicio",
  aproximacion: "Aproximación",
  impacto: "Impacto",
  posicion_final: "Posición final",
}

export type WizardState = {
  step: WizardStep
  unlockedSteps: WizardStep[]
  completedSteps: WizardStep[]
  isComplete: boolean
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: "inicio",
  unlockedSteps: ["inicio"],
  completedSteps: [],
  isComplete: false,
}

/**
 * Calcula el progreso del expediente basado en los pasos completados y el estado final.
 * 01 Inicio completado -> 20%
 * 02 Aproximación completada -> 50%
 * 03 Impacto completado -> 80%
 * 04 Posición final completada -> 100%
 */
export function calculateProgress(state: WizardState): number {
  if (state.isComplete || state.completedSteps.includes("posicion_final")) {
    return 100
  }
  if (state.completedSteps.includes("impacto")) {
    return 80
  }
  if (state.completedSteps.includes("aproximacion")) {
    return 50
  }
  if (state.completedSteps.includes("inicio")) {
    return 20
  }
  return 0
}

/**
 * Convierte un WizardStep a índice numérico de frame (0-3).
 */
export function stepToIndex(step: WizardStep): number {
  const idx = WIZARD_STEPS.indexOf(step)
  return idx >= 0 ? idx : 0
}

/**
 * Convierte un índice numérico de frame a WizardStep.
 */
export function indexToStep(index: number): WizardStep {
  if (index >= 0 && index < WIZARD_STEPS.length) {
    return WIZARD_STEPS[index]
  }
  return "inicio"
}

/**
 * Determina si se puede navegar directamente a un paso dado.
 * Solo se permite si el paso ya se encuentra desbloqueado.
 */
export function canTransitionTo(state: WizardState, targetStep: WizardStep): boolean {
  return state.unlockedSteps.includes(targetStep)
}

/**
 * Realiza una navegación a un paso previamente desbloqueado.
 * No altera los pasos completados ni desbloqueados.
 */
export function transitionTo(state: WizardState, targetStep: WizardStep): WizardState {
  if (!canTransitionTo(state, targetStep)) {
    return state
  }
  return {
    ...state,
    step: targetStep,
  }
}

/**
 * Completa el paso actual, desbloquea el siguiente paso y avanza a él.
 */
export function completeCurrentStep(state: WizardState): WizardState {
  const currentIdx = WIZARD_STEPS.indexOf(state.step)
  const isLast = currentIdx === WIZARD_STEPS.length - 1

  const newCompleted = state.completedSteps.includes(state.step)
    ? state.completedSteps
    : [...state.completedSteps, state.step]

  if (isLast) {
    return {
      ...state,
      completedSteps: newCompleted,
      isComplete: true,
    }
  }

  const nextStep = WIZARD_STEPS[currentIdx + 1]
  const newUnlocked = state.unlockedSteps.includes(nextStep)
    ? state.unlockedSteps
    : [...state.unlockedSteps, nextStep]

  return {
    ...state,
    step: nextStep,
    unlockedSteps: newUnlocked,
    completedSteps: newCompleted,
    isComplete: false,
  }
}

/**
 * Función de depuración: desbloquea todos los pasos hasta el targetStep y salta a él.
 */
export function jumpToStepDebug(state: WizardState, targetStep: WizardStep): WizardState {
  const targetIdx = WIZARD_STEPS.indexOf(targetStep)
  const stepsToUnlock = WIZARD_STEPS.slice(0, targetIdx + 1)
  const completed = WIZARD_STEPS.slice(0, targetIdx)

  const newUnlocked = Array.from(new Set([...state.unlockedSteps, ...stepsToUnlock]))
  const newCompleted = Array.from(new Set([...state.completedSteps, ...completed]))

  return {
    step: targetStep,
    unlockedSteps: newUnlocked,
    completedSteps: newCompleted,
    isComplete: targetStep === "posicion_final" ? state.isComplete : false,
  }
}

/**
 * Sanitiza y valida un estado recuperado de localStorage / migración.
 */
export function sanitizeWizardState(raw: any): WizardState {
  if (!raw || typeof raw !== "object") {
    return { ...INITIAL_WIZARD_STATE }
  }

  const step: WizardStep = WIZARD_STEPS.includes(raw.step) ? raw.step : "inicio"
  const unlockedSteps: WizardStep[] = Array.isArray(raw.unlockedSteps)
    ? raw.unlockedSteps.filter((s: any): s is WizardStep => WIZARD_STEPS.includes(s))
    : ["inicio"]

  if (!unlockedSteps.includes("inicio")) {
    unlockedSteps.unshift("inicio")
  }
  if (!unlockedSteps.includes(step)) {
    unlockedSteps.push(step)
  }

  const completedSteps: WizardStep[] = Array.isArray(raw.completedSteps)
    ? raw.completedSteps.filter((s: any): s is WizardStep => WIZARD_STEPS.includes(s))
    : []

  const isComplete = Boolean(raw.isComplete)

  return {
    step,
    unlockedSteps,
    completedSteps,
    isComplete,
  }
}
