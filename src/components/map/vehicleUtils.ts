export type VehicleVariant =
  | "bicycle"
  | "bus"
  | "car"
  | "motorcycle"
  | "tractor"
  | "truck"
  | "van"

export function getVehicleVariant(label: string): VehicleVariant {
  const value = label.toLowerCase()
  if (value.includes("biciclet")) return "bicycle"
  if (
    value.includes("moto") ||
    value.includes("scooter") ||
    value.includes("ciclomotor") ||
    value.includes("enduro") ||
    value.includes("trial")
  )
    return "motorcycle"
  if (
    value.includes("autob") ||
    value.includes("autocar") ||
    value.includes("microb")
  )
    return "bus"
  if (
    value.includes("camión") ||
    value.includes("tractocam") ||
    value.includes("tráiler") ||
    value.includes("remolque") ||
    value.includes("tren de carretera")
  )
    return "truck"
  if (value.includes("tractor") || value.includes("maquinaria")) return "tractor"
  if (
    value.includes("furgoneta") ||
    value.includes("camioneta") ||
    value.includes("pick-up") ||
    value.includes("monovolumen")
  )
    return "van"
  return "car"
}

export function getVehicleDimensions(variant: VehicleVariant = "car", scale = 1) {
  let lengthMeters = 4.5
  let widthMeters = 1.8

  switch (variant) {
    case "motorcycle":
    case "bicycle":
      lengthMeters = 2.2
      widthMeters = 0.8
      break
    case "truck":
    case "bus":
      lengthMeters = 9.5
      widthMeters = 2.5
      break
    case "van":
      lengthMeters = 5.2
      widthMeters = 2.0
      break
    case "tractor":
      lengthMeters = 4.0
      widthMeters = 2.2
      break
    default:
      lengthMeters = 4.5
      widthMeters = 1.8
      break
  }

  return {
    lengthMeters: lengthMeters * scale,
    widthMeters: widthMeters * scale,
  }
}
