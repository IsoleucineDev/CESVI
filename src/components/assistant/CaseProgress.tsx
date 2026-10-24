import { useEffect, useState } from "react"
import type { AssistantTopic } from "../../lib/assistantApi"

const STEPS = ["Ubicación", "Vehículos", "Dinámica", "Evidencia", "Informe"]

export default function CaseProgress({
  progress: progressProp,
  topics: topicsProp,
}: {
  progress?: number
  topics?: AssistantTopic[]
}) {
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
  const isDone = (step: string) => topics.some((t) => t.name === step && t.done)
  const current = STEPS.findIndex((step) => !isDone(step))

  return (
    <div className="case-progress">
      <div className="progress-copy">
        <span>PROGRESO DEL EXPEDIENTE</span>
        <b>{progress}%</b>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="steps">
        {STEPS.map((step, index) => (
          <div
            className={isDone(step) ? "done" : index === current ? "current" : ""}
            key={step}
          >
            <span>{isDone(step) ? "✓" : index + 1}</span>
            <small>{step}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
