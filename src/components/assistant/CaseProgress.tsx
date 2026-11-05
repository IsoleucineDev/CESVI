import { useEffect, useState } from "react"
import type { AssistantTopic } from "../../lib/assistantApi"

const STEPS = ["Ubicación", "Vehículos", "Dinámica", "Evidencia", "Informe"]

type CaseProgressProps = {
  progress?: number
  topics?: AssistantTopic[]
  activeStepIndex?: number
  unlockedIndices?: number[]
  onSelectStepIndex?: (index: number) => void
}

export default function CaseProgress({
  progress: progressProp,
  topics: topicsProp,
  activeStepIndex,
  unlockedIndices = [0],
  onSelectStepIndex,
}: CaseProgressProps) {
  const [state, setState] = useState<{ progress: number; topics: AssistantTopic[] }>({
    progress: 0,
    topics: [],
  })

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail
      setState({
        progress: Number(detail?.progress ?? 0),
        topics: Array.isArray(detail?.topics) ? detail.topics : [],
      })
    }
    window.addEventListener("cesvi:progress", onProgress)
    return () => window.removeEventListener("cesvi:progress", onProgress)
  }, [])

  const progress = progressProp ?? state.progress
  const topics = topicsProp ?? state.topics

  // Determinar pasos completados basado en el progreso real o en topics de la IA
  const isDone = (stepName: string, index: number) => {
    if (topics.some((t) => t.name === stepName && t.done)) return true
    if (index === 0 && progress >= 20) return true
    if (index === 1 && progress >= 50) return true
    if (index === 2 && progress >= 80) return true
    if (index === 3 && progress >= 80) return true
    if (index === 4 && progress >= 100) return true
    return false
  }

  // Si no se pasa activeStepIndex, buscar el primer paso incompleto
  const current = activeStepIndex ?? STEPS.findIndex((step, idx) => !isDone(step, idx))

  return (
    <div className="case-progress" role="region" aria-label="Progreso del expediente">
      <div className="progress-copy">
        <span>PROGRESO DEL EXPEDIENTE</span>
        <b>{progress}%</b>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="steps">
        {STEPS.map((step, index) => {
          const done = isDone(step, index)
          const isCurrent = index === current
          const isUnlocked = unlockedIndices.includes(index) || done

          return (
            <div
              className={`${done ? "done" : isCurrent ? "current" : ""} ${isUnlocked ? "clickable" : "locked"}`}
              key={step}
              onClick={() => {
                if (isUnlocked && onSelectStepIndex) {
                  onSelectStepIndex(index)
                }
              }}
              role={isUnlocked && onSelectStepIndex ? "button" : undefined}
              tabIndex={isUnlocked && onSelectStepIndex ? 0 : undefined}
              title={
                isUnlocked
                  ? `Ir a paso ${step}`
                  : `Paso ${step} bloqueado (completa los pasos anteriores)`
              }
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && isUnlocked && onSelectStepIndex) {
                  e.preventDefault()
                  onSelectStepIndex(index)
                }
              }}
            >
              <span>{done ? "✓" : index + 1}</span>
              <small>{step}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}
