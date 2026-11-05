import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  INITIAL_WIZARD_STATE,
  calculateProgress,
  canTransitionTo,
  transitionTo,
  completeCurrentStep,
  jumpToStepDebug,
  sanitizeWizardState,
  stepToIndex,
  indexToStep,
  type WizardState,
} from "./wizardMachine.ts"

describe("Máquina de estados del Wizard (wizardMachine)", () => {
  it("Inicia en 'inicio' con 0% de progreso y solo 'inicio' desbloqueado", () => {
    const state = { ...INITIAL_WIZARD_STATE }
    assert.equal(state.step, "inicio")
    assert.deepEqual(state.unlockedSteps, ["inicio"])
    assert.deepEqual(state.completedSteps, [])
    assert.equal(state.isComplete, false)
    assert.equal(calculateProgress(state), 0)
  })

  it("Rechaza navegación a pasos que no están desbloqueados", () => {
    const state = { ...INITIAL_WIZARD_STATE }
    assert.equal(canTransitionTo(state, "aproximacion"), false)
    assert.equal(canTransitionTo(state, "impacto"), false)
    assert.equal(canTransitionTo(state, "posicion_final"), false)

    const nextState = transitionTo(state, "impacto")
    assert.equal(nextState.step, "inicio") // No cambia
  })

  it("Al completar 'inicio', desbloquea 'aproximacion', avanza el paso y progreso es 20%", () => {
    const state = { ...INITIAL_WIZARD_STATE }
    const s1 = completeCurrentStep(state)

    assert.equal(s1.step, "aproximacion")
    assert.deepEqual(s1.unlockedSteps, ["inicio", "aproximacion"])
    assert.deepEqual(s1.completedSteps, ["inicio"])
    assert.equal(calculateProgress(s1), 20)
  })

  it("Al completar 'aproximacion', desbloquea 'impacto' y progreso es 50%", () => {
    const state = completeCurrentStep(INITIAL_WIZARD_STATE) // en aproximacion
    const s2 = completeCurrentStep(state)

    assert.equal(s2.step, "impacto")
    assert.deepEqual(s2.unlockedSteps, ["inicio", "aproximacion", "impacto"])
    assert.deepEqual(s2.completedSteps, ["inicio", "aproximacion"])
    assert.equal(calculateProgress(s2), 50)
  })

  it("Permite volver a un paso anterior ya desbloqueado sin perder datos ni progreso", () => {
    let state = completeCurrentStep(INITIAL_WIZARD_STATE) // en aproximacion
    state = completeCurrentStep(state) // en impacto

    assert.equal(state.step, "impacto")
    assert.equal(calculateProgress(state), 50)

    // El usuario retrocede a 'inicio'
    const backToInicio = transitionTo(state, "inicio")
    assert.equal(backToInicio.step, "inicio")
    assert.deepEqual(backToInicio.unlockedSteps, ["inicio", "aproximacion", "impacto"])
    assert.deepEqual(backToInicio.completedSteps, ["inicio", "aproximacion"])
    // El progreso se conserva porque los pasos ya se completaron
    assert.equal(calculateProgress(backToInicio), 50)

    // Puede regresar a 'impacto' directamente
    const backToImpacto = transitionTo(backToInicio, "impacto")
    assert.equal(backToImpacto.step, "impacto")
  })

  it("Al completar 'impacto', desbloquea 'posicion_final' y progreso es 80%", () => {
    let state = completeCurrentStep(INITIAL_WIZARD_STATE) // aproximacion
    state = completeCurrentStep(state) // impacto
    state = completeCurrentStep(state) // posicion_final

    assert.equal(state.step, "posicion_final")
    assert.deepEqual(state.unlockedSteps, ["inicio", "aproximacion", "impacto", "posicion_final"])
    assert.deepEqual(state.completedSteps, ["inicio", "aproximacion", "impacto"])
    assert.equal(calculateProgress(state), 80)
  })

  it("Al completar 'posicion_final', marca isComplete y progreso es 100%", () => {
    let state = completeCurrentStep(INITIAL_WIZARD_STATE) // aproximacion
    state = completeCurrentStep(state) // impacto
    state = completeCurrentStep(state) // posicion_final
    state = completeCurrentStep(state) // finalizado

    assert.equal(state.step, "posicion_final")
    assert.equal(state.isComplete, true)
    assert.equal(calculateProgress(state), 100)
  })

  it("jumpToStepDebug desbloquea los pasos intermedios y salta directamente al solicitado", () => {
    const jumped = jumpToStepDebug(INITIAL_WIZARD_STATE, "impacto")
    assert.equal(jumped.step, "impacto")
    assert.deepEqual(jumped.unlockedSteps, ["inicio", "aproximacion", "impacto"])
    assert.deepEqual(jumped.completedSteps, ["inicio", "aproximacion"])
    assert.equal(calculateProgress(jumped), 50)
  })

  it("sanitizeWizardState maneja valores nulos o corruptos y garantiza validez", () => {
    const empty = sanitizeWizardState(null)
    assert.deepEqual(empty, INITIAL_WIZARD_STATE)

    const corrupt = sanitizeWizardState({ step: "paso_inexistente", unlockedSteps: ["invalido"] })
    assert.equal(corrupt.step, "inicio")
    assert.deepEqual(corrupt.unlockedSteps, ["inicio"])

    const validRaw = {
      step: "impacto",
      unlockedSteps: ["inicio", "aproximacion", "impacto"],
      completedSteps: ["inicio", "aproximacion"],
      isComplete: false,
    }
    const sanitized = sanitizeWizardState(validRaw)
    assert.deepEqual(sanitized, validRaw)
  })

  it("Conversión bidireccional de índices a pasos", () => {
    assert.equal(stepToIndex("inicio"), 0)
    assert.equal(stepToIndex("aproximacion"), 1)
    assert.equal(stepToIndex("impacto"), 2)
    assert.equal(stepToIndex("posicion_final"), 3)

    assert.equal(indexToStep(0), "inicio")
    assert.equal(indexToStep(1), "aproximacion")
    assert.equal(indexToStep(2), "impacto")
    assert.equal(indexToStep(3), "posicion_final")
    assert.equal(indexToStep(99), "inicio")
  })
})
