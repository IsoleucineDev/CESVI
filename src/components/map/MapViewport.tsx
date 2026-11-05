import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"

export default function MapViewport({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()
  const prevRef = useRef<{ center: [number, number]; zoom: number }>({ center, zoom })

  useEffect(() => {
    if (
      prevRef.current.center[0] !== center[0] ||
      prevRef.current.center[1] !== center[1] ||
      prevRef.current.zoom !== zoom
    ) {
      prevRef.current = { center, zoom }
      map.flyTo(center, zoom, { duration: 0.7 })
    }
  }, [center, map, zoom])

  return null
}
