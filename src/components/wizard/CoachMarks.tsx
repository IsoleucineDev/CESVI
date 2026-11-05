import { useEffect, useState } from "react"
import type { WizardStep } from "../../lib/wizardMachine"
import Icon from "../ui/Icon"

const COACH_STORAGE_KEY = "cesvi_coachmarks_dismissed"

const COACH_CONTENT: Record<WizardStep, { title: string; desc: string; targetPosition: string }> = {
  inicio: {
    title: "1. Buscador de Ubicación",
    desc: "Ingresa la calle o cruce del siniestro y presiona Enter para centrar el mapa.",
    targetPosition: "top-left",
  },
  aproximacion: {
    title: "2. Herramienta de Vehículos",
    desc: "Selecciona el tipo de vehículo y toca el mapa para colocarlo en su aproximación previa.",
    targetPosition: "top-tools",
  },
  impacto: {
    title: "3. Punto de Impacto",
    desc: "Toca el mapa para fijar el punto de colisión. El marcador rojo de pulso es arrastrable.",
    targetPosition: "center-map",
  },
  posicion_final: {
    title: "4. Finalizar Expediente",
    desc: "Arrastra los vehículos a su posición de reposo final y haz clic en Finalizar para exportar.",
    targetPosition: "assistant-footer",
  },
}

type CoachMarksProps = {
  currentStep: WizardStep
}

export default function CoachMarks({ currentStep }: CoachMarksProps) {
  const [dismissedSteps, setDismissedSteps] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(COACH_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const isDismissed = dismissedSteps.includes(currentStep)
  const info = COACH_CONTENT[currentStep]

  const dismiss = () => {
    const updated = [...dismissedSteps, currentStep]
    setDismissedSteps(updated)
    try {
      localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  if (isDismissed || !info) return null

  return (
    <aside
      className={`coach-mark-banner coach-${info.targetPosition}`}
      role="tooltip"
      aria-live="polite"
    >
      <div className="coach-mark-badge">
        <span className="coach-pulse" />
        <Icon name="search" size={14} />
      </div>
      <div className="coach-mark-body">
        <strong>{info.title}</strong>
        <p>{info.desc}</p>
      </div>
      <button
        type="button"
        className="coach-dismiss-btn"
        onClick={dismiss}
        title="Entendido, descartar sugerencia"
      >
        Entendido
      </button>
    </aside>
  )
}
