import { useEffect } from "react"
import { useMap, useMapEvents } from "react-leaflet"
import type { Map as LeafletMap } from "leaflet"

export default function MapInstanceBridge({
  onMapInit,
  onZoomChange,
}: {
  onMapInit: (map: LeafletMap) => void
  onZoomChange: (zoom: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    onMapInit(map)
    onZoomChange(map.getZoom())
  }, [map, onMapInit, onZoomChange])

  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  })

  return null
}
