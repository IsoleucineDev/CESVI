import { useState } from "react"
import { distanceMeters, type GeoPosition } from "../../lib/geo"
import { STEP_LABELS, WIZARD_STEPS, type WizardStep } from "../../lib/wizardMachine"

export type TestLocation = {
  name: string
  lat: number
  lng: number
}

export const TEST_LOCATIONS: TestLocation[] = [
  {
    name: "Avenida Sebastián Lerdo de Tejada, Toluca",
    lat: 19.28882,
    lng: -99.65568,
  },
  {
    name: "Plaza de la Constitución, Zócalo CDMX",
    lat: 19.4326,
    lng: -99.1332,
  },
  {
    name: "Centro Histórico, Guadalajara",
    lat: 20.6767,
    lng: -103.347,
  },
]

type DebugPanelProps = {
  anchor: GeoPosition
  activeSceneIndex: number
  activeSceneName: string
  currentStep?: WizardStep
  v1: GeoPosition & { rotation: number }
  v2: GeoPosition & { rotation: number }
  evidence: Array<{ label: string; lat: number; lng: number }>
  onRelocate: (name: string, coords: GeoPosition) => void
  onJumpToStep?: (step: WizardStep) => void
}

export default function DebugPanel({
  anchor,
  activeSceneIndex,
  activeSceneName,
  currentStep,
  v1,
  v2,
  evidence,
  onRelocate,
  onJumpToStep,
}: DebugPanelProps) {
  const isDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1"

  if (!isDebug) return null

  // Ciclo: CDMX Zócalo (1) -> Toluca (0) -> Guadalajara (2) -> CDMX Zócalo (1)
  let nextIdx = 0
  if (Math.abs(anchor.lat - TEST_LOCATIONS[1].lat) < 0.05) {
    nextIdx = 0 // Si está en Zócalo, siguiente es Toluca
  } else if (Math.abs(anchor.lat - TEST_LOCATIONS[0].lat) < 0.05) {
    nextIdx = 2 // Si está en Toluca, siguiente es Guadalajara
  } else {
    nextIdx = 1 // Si está en Guadalajara (o cualquier otro), siguiente es Zócalo
  }

  const nextLocation = TEST_LOCATIONS[nextIdx]
  const e1 = evidence.find((e) => e.label === "E1") ?? { lat: 0, lng: 0 }
  const e2 = evidence.find((e) => e.label === "E2") ?? { lat: 0, lng: 0 }
  const distV1V2 = distanceMeters(v1, v2)

  const handleTestRelocate = () => {
    onRelocate(nextLocation.name, { lat: nextLocation.lat, lng: nextLocation.lng })
  }

  return (
    <aside
      aria-label="Panel de depuración"
      className="debug-panel"
      style={{
        position: "fixed",
        bottom: 56,
        left: 14,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.94)",
        color: "#f8fafc",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        border: "1px solid rgba(56, 189, 248, 0.4)",
        maxWidth: 380,
        lineHeight: 1.45,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          paddingBottom: 4,
        }}
      >
        <strong style={{ color: "#38bdf8", letterSpacing: "0.5px" }}>
          ⚡ CESVI DEBUG HUD
        </strong>
        <span
          style={{
            background: "#0284c7",
            color: "#fff",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: "bold",
          }}
        >
          ?debug=1
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 3 }}>
        <div>
          <span style={{ color: "#94a3b8" }}>Anchor: </span>
          <b style={{ color: "#34d399" }}>
            {anchor.lat.toFixed(5)}, {anchor.lng.toFixed(5)}
          </b>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Escena: </span>
          <b>
            0{activeSceneIndex + 1} · {activeSceneName}
          </b>
        </div>
        <div style={{ marginTop: 2 }}>
          <span style={{ color: "#94a3b8" }}>V1: </span>
          <span>
            {v1.lat.toFixed(5)}, {v1.lng.toFixed(5)} ({v1.rotation}°)
          </span>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>V2: </span>
          <span>
            {v2.lat.toFixed(5)}, {v2.lng.toFixed(5)} ({v2.rotation}°)
          </span>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>E1 / E2: </span>
          <span>
            E1: {e1.lat.toFixed(5)}, {e1.lng.toFixed(5)} | E2: {e2.lat.toFixed(5)},{" "}
            {e2.lng.toFixed(5)}
          </span>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Distancia V1↔V2: </span>
          <b style={{ color: "#facc15" }}>{distV1V2.toFixed(2)} m</b>
        </div>
      </div>

      <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <button
          onClick={handleTestRelocate}
          style={{
            width: "100%",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 5,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background 0.15s ease",
          }}
          type="button"
        >
          📍 Probar reubicación ({nextLocation.name.split(",")[0]})
        </button>
      </div>

      <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ color: "#94a3b8", marginBottom: 5, fontSize: 10, fontWeight: 600 }}>
          SALTAR A PASO (DEBUG):
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {WIZARD_STEPS.map((step, idx) => {
            const stepNumber = String(idx + 1).padStart(2, "0")
            const isCurrent = currentStep ? currentStep === step : activeSceneIndex === idx
            return (
              <button
                key={step}
                type="button"
                onClick={() => onJumpToStep?.(step)}
                title={`Saltar a ${STEP_LABELS[step]}`}
                style={{
                  background: isCurrent ? "#0284c7" : "rgba(255, 255, 255, 0.08)",
                  color: isCurrent ? "#ffffff" : "#cbd5e1",
                  border: isCurrent
                    ? "1px solid #38bdf8"
                    : "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: 4,
                  padding: "5px 6px",
                  fontSize: 10,
                  fontWeight: isCurrent ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                {isCurrent && <span style={{ fontSize: 8 }}>●</span>}
                Saltar a paso {stepNumber}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
