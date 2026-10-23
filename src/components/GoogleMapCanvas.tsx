import { APIProvider, AdvancedMarker, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";
import VehicleIcon, { type VehicleType } from "./VehicleIcon";

type GeocoderResult = { geometry?: { location?: { lat: () => number; lng: () => number } } };
type AutocompletePrediction = { description: string; place_id: string };

export type Vehicle = {
  id: string;
  type: VehicleType;
  color: string;
  label: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  brakeM: number;
  model: string;
};

type GoogleMapCanvasProps = {
  apiKey: string;
  mapId: string;
  theme: "light" | "dark";
  address: string;
  zoom: number;
  vehicles: Vehicle[];
  selectedVehicleId: string;
  interactionMode: "select" | "move";
  onSelectVehicle: (id: string) => void;
  onVehicleMove: (id: string, lat: number, lng: number) => void;
  onZoomChange: (zoom: number) => void;
  onHeadingChange: (heading: number) => void;
  children?: React.ReactNode;
};

const metersPerPixel = (lat: number, zoom: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);

function MapController({
  address,
  onZoomChange,
  onHeadingChange,
}: Pick<GoogleMapCanvasProps, "address" | "onZoomChange" | "onHeadingChange">) {
  const map = useMap();
  const geocoding = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!map || !geocoding || !address.trim()) return;
    const geocoder = new geocoding.Geocoder();
    geocoder.geocode({ address }, (results: GeocoderResult[] | null, status: string) => {
      const location = results?.[0]?.geometry?.location;
      if (status === "OK" && location) {
        map.panTo(location);
        map.setZoom(19);
      }
    });
  }, [address, geocoding, map]);

  useEffect(() => {
    if (!map) return;
    const zoomListener = map.addListener("zoom_changed", () => onZoomChange(map.getZoom() ?? 19));
    const headingListener = map.addListener("heading_changed", () => onHeadingChange(map.getHeading() ?? 0));
    onZoomChange(map.getZoom() ?? 19);
    onHeadingChange(map.getHeading() ?? 0);
    return () => {
      zoomListener.remove();
      headingListener.remove();
    };
  }, [map, onHeadingChange, onZoomChange]);

  return null;
}

function MapVehicleMarkers({
  vehicles,
  selectedVehicleId,
  interactionMode,
  onSelectVehicle,
  onVehicleMove,
  zoom,
}: Pick<GoogleMapCanvasProps, "vehicles" | "selectedVehicleId" | "interactionMode" | "onSelectVehicle" | "onVehicleMove"> & { zoom: number }) {
  return (
    <>
      {vehicles.map((vehicle) => {
        const lengthMeters = vehicle.type === "sedan" ? 4.6 : vehicle.type === "suv" ? 4.8 : vehicle.type === "truck" ? 8 : 2.1;
        const lengthPx = Math.min(420, Math.max(36, lengthMeters / metersPerPixel(vehicle.lat, zoom)));
        return (
          <AdvancedMarker
            clickable
            draggable={interactionMode === "move"}
            key={vehicle.id}
            onClick={() => onSelectVehicle(vehicle.id)}
            onDragEnd={(event) => {
              const position = event.latLng;
              if (position) onVehicleMove(vehicle.id, position.lat(), position.lng());
            }}
            position={{ lat: vehicle.lat, lng: vehicle.lng }}
            title={vehicle.model}
          >
            <VehicleIcon
              color={vehicle.color}
              heading={vehicle.heading}
              label={vehicle.label}
              lengthPx={lengthPx}
              selected={vehicle.id === selectedVehicleId}
              type={vehicle.type}
            />
          </AdvancedMarker>
        );
      })}
      <AdvancedMarker position={{ lat: 19.427, lng: -99.167 }} title="Impacto">
        <div className="impact-marker-map" aria-label="Marcador de impacto">✦</div>
      </AdvancedMarker>
      {[{ lat: 19.4278, lng: -99.166 }, { lat: 19.4262, lng: -99.168 }].map((point, index) => (
        <AdvancedMarker key={index} position={point} title={`Evidencia E${index + 1}`}>
          <div className="evidence-marker">{`E${index + 1}`}</div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export function GoogleMapsRuntime({ apiKey, children }: { apiKey: string; children: React.ReactNode }) {
  if (!apiKey) return <>{children}</>;
  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding", "marker"]}>
      {children}
    </APIProvider>
  );
}

export function LocationAutocomplete({
  apiKey,
  value,
  onChange,
  onPlaceSelect,
}: {
  apiKey: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: string) => void;
}) {
  const places = useMapsLibrary("places");
  const [suggestions, setSuggestions] = useState<{ description: string; placeId: string }[]>([]);

  useEffect(() => {
    if (!places || !value.trim()) {
      setSuggestions([]);
      return;
    }
    const service = new places.AutocompleteService();
    let cancelled = false;
    service.getPlacePredictions({ input: value, componentRestrictions: { country: "mx" } }, (predictions: AutocompletePrediction[] | null) => {
      if (!cancelled) setSuggestions((predictions ?? []).slice(0, 5).map((prediction: AutocompletePrediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
      })));
    });
    return () => {
      cancelled = true;
    };
  }, [places, value]);

  return (
    <div className="location-autocomplete">
      <input
        aria-label="Buscar ubicación"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onPlaceSelect(value);
        }}
        value={value}
      />
      {suggestions.length > 0 && (
        <div className="location-suggestions">
          {suggestions.map((suggestion) => (
            <button key={suggestion.placeId} onClick={() => { onChange(suggestion.description); onPlaceSelect(suggestion.description); }} type="button">
              {suggestion.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoogleMapCanvas(props: GoogleMapCanvasProps) {
  const [zoom, setZoom] = useState(19);
  const center = useMemo(() => ({ lat: props.vehicles[0]?.lat ?? 19.427, lng: props.vehicles[0]?.lng ?? -99.167 }), [props.vehicles]);
  return (
    <div className="google-map-layer">
      <Map
        center={center}
        clickableIcons={false}
        colorScheme={props.theme === "dark" ? "DARK" : "LIGHT"}
        defaultZoom={19}
        disableDefaultUI
        gestureHandling="greedy"
        mapId={props.mapId}
        mapTypeId="roadmap"
        zoom={props.zoom}
        onZoomChanged={(event) => {
          const nextZoom = event.detail.zoom;
          setZoom(nextZoom);
          props.onZoomChange(nextZoom);
        }}
      >
        <MapController address={props.address} onHeadingChange={props.onHeadingChange} onZoomChange={props.onZoomChange} />
        <MapVehicleMarkers
          interactionMode={props.interactionMode}
          onSelectVehicle={props.onSelectVehicle}
          onVehicleMove={props.onVehicleMove}
          selectedVehicleId={props.selectedVehicleId}
          vehicles={props.vehicles}
          zoom={zoom}
        />
      </Map>
      {props.children}
    </div>
  );
}
