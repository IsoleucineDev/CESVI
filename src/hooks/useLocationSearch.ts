import { useEffect, useRef, useState } from "react"
import type { LocationSuggestion } from "../types/scenario"

export function useLocationSearch(initialQuery = "Av. Paseo de la Reforma 222") {
  const [locationQuery, setLocationQuery] = useState(initialQuery)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const locationQueryInitialized = useRef(false)

  useEffect(() => {
    if (!locationQueryInitialized.current) {
      locationQueryInitialized.current = true
      return
    }
    const query = locationQuery.trim()
    if (query.length < 3) {
      setLocationSuggestions([])
      setLocationSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLocationSearchLoading(true)
      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "5",
          "accept-language": "es",
        })
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        )
        if (!response.ok) throw new Error("No se pudieron buscar ubicaciones")
        const results = (await response.json()) as LocationSuggestion[]
        setLocationSuggestions(results)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLocationSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLocationSearchLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [locationQuery])

  return {
    locationQuery,
    setLocationQuery,
    locationSuggestions,
    setLocationSuggestions,
    locationSearchLoading,
  }
}
