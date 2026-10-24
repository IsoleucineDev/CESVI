import { useEffect, useRef } from "react"
import type { AssistantAction } from "../lib/assistantApi"

// Úsalo en el componente que guarda los vehículos / el mapa:
//   useAssistantActions((actions) => applyActions(actions))
export function useAssistantActions(handler: (actions: AssistantAction[]) => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const onActions = (event: Event) => {
      const actions = (event as CustomEvent<AssistantAction[]>).detail ?? []
      handlerRef.current(actions)
    }
    window.addEventListener("cesvi:actions", onActions)
    return () => window.removeEventListener("cesvi:actions", onActions)
  }, [])
}
