import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildReportPdf, type CaseDataForPdf } from "./exportPdf.ts"

describe("Módulo exportPdf - Generación de Informe Pericial PDF", () => {
  it("buildReportPdf genera un documento PDF válido sin lanzar errores con datos completos", () => {
    const mockCase: CaseDataForPdf = {
      caseId: "EXP-0248",
      anchor: { lat: 19.28882, lng: -99.65568 },
      locationQuery: "Avenida Sebastián Lerdo de Tejada, Toluca, Estado de México",
      vehicles: {
        V1: {
          type: "Automóvil",
          model: "Nissan Versa",
          direction: "NE",
          speed: 50,
          rotation: 45,
          lat: 19.2887,
          lng: -99.6558,
          postImpactOffset: { lat: 19.2889, lng: -99.6555, rotation: 55 },
          impactZone: "Frontal derecho",
        },
        V2: {
          type: "Camioneta",
          model: "Ford Ranger",
          direction: "SE",
          speed: 40,
          rotation: 135,
          lat: 19.2889,
          lng: -99.6559,
          postImpactOffset: { lat: 19.2887, lng: -99.6554, rotation: 120 },
          impactZone: "Lateral izquierdo",
        },
      },
      impactPosition: { lat: 19.28882, lng: -99.65568 },
      impactVehicles: ["V1", "V2"],
      impactTime: "00:03.38",
      impactZones: { V1: "Frontal derecho", V2: "Lateral izquierdo" },
      evidencePositions: [
        { label: "E1", lat: 19.28875, lng: -99.65572 },
        { label: "E2", lat: 19.28888, lng: -99.65562 },
      ],
      droppedItems: [
        { label: "Semáforo peatonal", kind: "object", lat: 19.2888, lng: -99.6556 },
      ],
      wizardState: { isComplete: true },
    }

    const doc = buildReportPdf(mockCase)
    assert.ok(doc, "El documento generado debe existir")
    assert.strictEqual(typeof doc.getNumberOfPages, "function")
    assert.strictEqual(doc.getNumberOfPages(), 2, "El informe debe contar con 2 páginas estructuradas")

    const output = doc.output("arraybuffer")
    assert.ok(output.byteLength > 1000, "El buffer del PDF debe contener datos")
  })

  it("buildReportPdf maneja casos con datos mínimos o faltantes usando 'No registrado' sin fallar", () => {
    const minimalCase: CaseDataForPdf = {
      anchor: { lat: 19.4326, lng: -99.1332 },
      vehicles: {},
    }

    const doc = buildReportPdf(minimalCase)
    assert.ok(doc)
    assert.ok(doc.getNumberOfPages() >= 1)
  })
})
