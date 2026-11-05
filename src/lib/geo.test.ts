import test from "node:test"
import assert from "node:assert/strict"
import {
  toLatLng,
  toOffsetM,
  distanceMeters,
  offsetDistanceMeters,
  type GeoPosition,
  type OffsetM,
} from "./geo.ts"

test("Módulo geo - Round-trip: offset -> latLng -> offset con error < 0.01 m", () => {
  const anchors: GeoPosition[] = [
    { lat: 19.4326, lng: -99.1332 }, // CDMX Zócalo
    { lat: 19.2925, lng: -99.6569 }, // Toluca
    { lat: 20.6767, lng: -103.347 }, // Guadalajara
    { lat: 0.0, lng: 0.0 }, // Ecuador
    { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  ]

  const testOffsets: OffsetM[] = [
    { x: 0, y: 0 },
    { x: 38.96, y: -27.83 },
    { x: -150.25, y: 220.75 },
    { x: 12.345, y: -54.321 },
    { x: -500, y: -500 },
  ]

  for (const anchor of anchors) {
    for (const offset of testOffsets) {
      const latLng = toLatLng(anchor, offset)
      const roundTripOffset = toOffsetM(anchor, latLng)

      const errX = Math.abs(roundTripOffset.x - offset.x)
      const errY = Math.abs(roundTripOffset.y - offset.y)

      assert.ok(
        errX < 0.01,
        `Error en X excede 0.01 m (fue ${errX} m) para ancla ${JSON.stringify(anchor)} y offset ${JSON.stringify(offset)}`,
      )
      assert.ok(
        errY < 0.01,
        `Error en Y excede 0.01 m (fue ${errY} m) para ancla ${JSON.stringify(anchor)} y offset ${JSON.stringify(offset)}`,
      )
    }
  }
})

test("Módulo geo - Round-trip: latLng -> offset -> latLng", () => {
  const anchor: GeoPosition = { lat: 19.2925, lng: -99.6569 }
  const points: GeoPosition[] = [
    { lat: 19.293, lng: -99.6565 },
    { lat: 19.292, lng: -99.6575 },
    { lat: 19.2915, lng: -99.6558 },
  ]

  for (const pt of points) {
    const offset = toOffsetM(anchor, pt)
    const roundTripPt = toLatLng(anchor, offset)

    const diffLat = Math.abs(roundTripPt.lat - pt.lat)
    const diffLng = Math.abs(roundTripPt.lng - pt.lng)

    // ~1e-12 grados
    assert.ok(diffLat < 1e-6, `Diferencia de latitud excede umbral: ${diffLat}`)
    assert.ok(diffLng < 1e-6, `Diferencia de longitud excede umbral: ${diffLng}`)
  }
})

test("Módulo geo - Las distancias relativas entre vehículos se conservan al reubicar el ancla", () => {
  const v1Offset: OffsetM = { x: -36.757, y: 38.962 }
  const v2Offset: OffsetM = { x: 36.757, y: -27.83 }
  const expectedDistanceM = offsetDistanceMeters(v1Offset, v2Offset)

  const anchors: GeoPosition[] = [
    { lat: 19.4326, lng: -99.1332 }, // Zócalo
    { lat: 19.2925, lng: -99.6569 }, // Toluca
    { lat: 20.6767, lng: -103.347 }, // Guadalajara
  ]

  for (const anchor of anchors) {
    const v1LatLng = toLatLng(anchor, v1Offset)
    const v2LatLng = toLatLng(anchor, v2Offset)
    const distGeographic = distanceMeters(v1LatLng, v2LatLng)

    const diff = Math.abs(distGeographic - expectedDistanceM)
    assert.ok(
      diff < 0.05,
      `La distancia en metros difiere significativamente tras reubicar: esperada ${expectedDistanceM}, obtenida ${distGeographic}`,
    )
  }
})

import { migrateLegacyCase } from "./migration.ts"

test("Módulo migration - Migración de expediente viejo con coordenadas absolutas", () => {
  const legacyCase = {
    center: [19.4326, -99.1332],
    locationQuery: "Zócalo CDMX",
    mapVehicles: {
      V1: { lat: 19.43295, lng: -99.13355, rotation: 38, scale: 1 },
      V2: { lat: 19.43235, lng: -99.13285, rotation: -61, scale: 1 },
    },
    impactPosition: { lat: 19.43262, lng: -99.13308 },
    evidencePositions: [
      { lat: 19.43325, lng: -99.13345, label: "E1" },
      { lat: 19.43208, lng: -99.13265, label: "E2" },
    ],
    droppedItems: [
      {
        id: "item-1",
        kind: "object",
        label: "Poste",
        lat: 19.4327,
        lng: -99.1331,
        rotation: 15,
        scale: 1.2,
      },
    ],
  }

  const migrated = migrateLegacyCase(legacyCase)

  assert.equal(migrated.version, 2)
  assert.equal(migrated.anchor.lat, 19.4326)
  assert.equal(migrated.anchor.lng, -99.1332)

  // V1 debe tener offsets métricos calculados
  assert.ok(Math.abs(migrated.vehicles.V1.x - -36.757) < 0.1)
  assert.ok(Math.abs(migrated.vehicles.V1.y - 38.962) < 0.1)
  assert.equal(migrated.vehicles.V1.rotation, 38)

  // V2
  assert.ok(Math.abs(migrated.vehicles.V2.x - 36.757) < 0.1)
  assert.ok(Math.abs(migrated.vehicles.V2.y - -27.83) < 0.1)
  assert.equal(migrated.vehicles.V2.rotation, -61)

  // Dropped item migrado a offset
  assert.equal(migrated.droppedItems.length, 1)
  assert.equal(migrated.droppedItems[0].label, "Poste")
  assert.ok(typeof migrated.droppedItems[0].x === "number")
  assert.ok(typeof migrated.droppedItems[0].y === "number")
})
