import { useCallback, useEffect, useRef, useState } from "react"
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

  /**
   * Geocodifica una dirección inmediatamente (ej. al presionar Enter).
   * Retorna null si falla o no encuentra resultados, permitiendo a la UI
   * rechazar el cambio de ancla sin alterar el mapa.
   */
  const searchAddress = useCallback(
    async (queryOverride?: string): Promise<LocationSuggestion | null> => {
      const q = (queryOverride ?? locationQuery).trim()
      if (q.length < 2) return null

      setLocationSearchLoading(true)
      try {
        const params = new URLSearchParams({
          q,
          format: "jsonv2",
          addressdetails: "1",
          limit: "5",
          "accept-language": "es",
        })
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
          },
        )
        if (!response.ok) return null
        const results = (await response.json()) as LocationSuggestion[]
        if (Array.isArray(results) && results.length > 0) {
          setLocationSuggestions(results)
          return results[0]
        }
        return null
      } catch {
        return null
      } finally {
        setLocationSearchLoading(false)
      }
    },
    [locationQuery],
  )

  return {
    locationQuery,
    setLocationQuery,
    locationSuggestions,
    setLocationSuggestions,
    locationSearchLoading,
    searchAddress,
  }
}
