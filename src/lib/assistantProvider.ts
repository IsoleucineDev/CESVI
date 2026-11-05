/**
 * Interfaz y proveedor base para el asistente pericial de CESVI.
 * Diseñado para admitir implementaciones asistidas por IA (Gemini/Groq)
 * manteniendo una implementación guiada determinista por defecto.
 */

export type AssistantContext = {
  step: "inicio" | "aproximacion" | "impacto" | "posicion_final" | string
  locationQuery?: string
  vehiclesCount?: number
  impactSet?: boolean
  isComplete?: boolean
  currentVehicleId?: string
  lastFeedback?: string
}

export interface AssistantProvider {
  readonly name: string
  suggest(context: AssistantContext): Promise<string>
}

/**
 * Proveedor guiado por reglas deterministas (comportamiento base actual sin llamadas externas a IA).
 */
export class GuidedAssistantProvider implements AssistantProvider {
  readonly name = "guiada"

  async suggest(context: AssistantContext): Promise<string> {
    switch (context.step) {
      case "inicio":
        return context.locationQuery
          ? `Ubicación registrada: "${context.locationQuery}". Confirma el punto en el mapa para iniciar la aproximación de vehículos.`
          : "Ingresa la calle, cruce o coordenadas del siniestro en el buscador para centrar el mapa interactivo."

      case "aproximacion":
        if (!context.vehiclesCount || context.vehiclesCount === 0) {
          return "Selecciona el tipo de vehículo (V1 o V2) y haz clic en el mapa para colocarlo en su aproximación previa."
        }
        return `Vehículo ${context.currentVehicleId || "activo"} posicionado. Traza su trayectoria previa o continúa con el siguiente vehículo.`

      case "impacto":
        if (!context.impactSet) {
          return "Toca el mapa interactivo para fijar el punto de colisión. El marcador de impacto con pulso es arrastrable."
        }
        return "Punto de impacto fijado. Selecciona la zona de contacto de cada vehículo e inspecciona los indicios antes de pasar a la posición final."

      case "posicion_final":
        if (context.isComplete) {
          return "¡Reconstrucción completada al 100%! Puedes exportar el informe pericial técnico en PDF y el modelo JSON para Unity."
        }
        return "Arrastra cada vehículo en el mapa hacia su posición de reposo post-impacto y ajusta su rotación final para culminar el expediente."

      default:
        return "Asistente pericial listo para guiar la reconstrucción del siniestro vial."
    }
  }
}

export const defaultAssistantProvider: AssistantProvider = new GuidedAssistantProvider()
