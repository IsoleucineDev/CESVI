/**
 * Módulo de proyección cartográfica plana local (ENU) para el visor vial CESVI.
 * Utiliza 111,320 m por grado de latitud y factor de escala cos(lat) para longitud.
 */

export type GeoPosition = {
  lat: number
  lng: number
}

export type OffsetM = {
  x: number // metros al Este (>0) u Oeste (<0) respecto al ancla
  y: number // metros al Norte (>0) o Sur (<0) respecto al ancla
}

export const METERS_PER_DEG_LAT = 111320

/**
 * Retorna los metros por grado de longitud evaluados a la latitud dada.
 */
export function metersPerDegLng(lat: number): number {
  const rad = (lat * Math.PI) / 180
  const cosLat = Math.cos(rad)
  return Math.max(1e-6, METERS_PER_DEG_LAT * cosLat)
}

/**
 * Convierte un offset métrico {x, y} respecto a un ancla geográfica en coordenadas WGS84 {lat, lng}.
 */
export function toLatLng(anchor: GeoPosition, offsetM: OffsetM): GeoPosition {
  const dLat = offsetM.y / METERS_PER_DEG_LAT
  const dLng = offsetM.x / metersPerDegLng(anchor.lat)
  return {
    lat: anchor.lat + dLat,
    lng: anchor.lng + dLng,
  }
}

/**
 * Convierte una coordenada WGS84 {lat, lng} en un offset métrico {x, y} respecto a un ancla geográfica.
 */
export function toOffsetM(anchor: GeoPosition, position: GeoPosition): OffsetM {
  const dLat = position.lat - anchor.lat
  const dLng = position.lng - anchor.lng
  const y = dLat * METERS_PER_DEG_LAT
  const x = dLng * metersPerDegLng(anchor.lat)
  return { x, y }
}

/**
 * Calcula la distancia métrica euclidiana aproximada entre dos coordenadas geográficas.
 */
export function distanceMeters(a: GeoPosition, b: GeoPosition): number {
  const dLat = (b.lat - a.lat) * METERS_PER_DEG_LAT
  const avgLat = (a.lat + b.lat) / 2
  const dLng = (b.lng - a.lng) * metersPerDegLng(avgLat)
  return Math.hypot(dLat, dLng)
}

/**
 * Calcula la distancia euclidiana entre dos puntos métricos relativos {x, y}.
 */
export function offsetDistanceMeters(a: OffsetM, b: OffsetM): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}
