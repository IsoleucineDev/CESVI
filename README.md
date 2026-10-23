# CESVI

## Google Maps

Para activar el mapa real, crea un archivo `.env.local` con:

```bash
VITE_GOOGLE_MAPS_API_KEY=tu-clave
VITE_GOOGLE_MAP_ID=tu-map-id-opcional
```

En Google Cloud habilita **Maps JavaScript API**, **Places API (New)** y **Geocoding API**. Restringe la clave por dominio mediante **HTTP referrer** y no la incluyas nunca en el código fuente. Si `VITE_GOOGLE_MAPS_API_KEY` no existe, Cesvi2 conserva el mapa simulado como respaldo.
