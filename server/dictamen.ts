import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/* ------------------------------ Tipos ------------------------------ */
export type Tone = "infrastructure" | "biological" | "physical" | "vehicle";

export type DictamenVehiculo = { etiqueta: string; modelo: string; tipo: string; velocidadKmh: number; direccion: string; frenadoM: number };
export type DictamenElemento = { etiqueta: string; grupo: string; clasificacion: string; categoria: string; tone: Tone; escena: string; propiedades: string };
export type DictamenPayload = {
  expediente: string;
  titulo: string;
  ubicacion: string;
  perito: string;
  escenas: string[];
  vehiculos: DictamenVehiculo[];
  elementos: DictamenElemento[];
  observaciones: string;
};

export class ValidationError extends Error {}

/* --------------------------- Validación ---------------------------- */
// Helvetica (WinAnsi) no codifica todos los caracteres: se normalizan o se sustituyen.
const clean = (value: unknown, max = 200, multiline = false): string => {
  let text = String(value ?? "")
    .normalize("NFC")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\u03BC\u00B5]/g, "mu")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\r/g, "");
  text = multiline ? text.replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "?") : text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ");
  return text.trim().slice(0, max);
};
const num = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);
const TONES: Tone[] = ["infrastructure", "biological", "physical", "vehicle"];

export function parseDictamen(input: unknown): DictamenPayload {
  if (!input || typeof input !== "object") throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON.");
  const raw = input as Record<string, unknown>;
  const list = (value: unknown, limit: number): Record<string, unknown>[] =>
    Array.isArray(value) ? (value.slice(0, limit).filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[]) : [];

  return {
    expediente: clean(raw.expediente, 40) || "SIN-FOLIO",
    titulo: clean(raw.titulo, 120) || "Reconstrucción vial",
    ubicacion: clean(raw.ubicacion, 200) || "No especificada",
    perito: clean(raw.perito, 120),
    escenas: (Array.isArray(raw.escenas) ? raw.escenas.slice(0, 60) : []).map((scene) => clean(scene, 80)),
    vehiculos: list(raw.vehiculos, 50).map((v) => ({
      etiqueta: clean(v.etiqueta, 12), modelo: clean(v.modelo, 80), tipo: clean(v.tipo, 40),
      velocidadKmh: num(v.velocidadKmh), direccion: clean(v.direccion, 20), frenadoM: num(v.frenadoM),
    })),
    elementos: list(raw.elementos, 300).map((e) => ({
      etiqueta: clean(e.etiqueta, 80), grupo: clean(e.grupo, 80), clasificacion: clean(e.clasificacion, 60),
      categoria: clean(e.categoria, 30), tone: TONES.includes(e.tone as Tone) ? (e.tone as Tone) : "infrastructure",
      escena: clean(e.escena, 80), propiedades: clean(e.propiedades, 200),
    })),
    observaciones: clean(raw.observaciones, 4000, true),
  };
}

/* ----------------------------- Estilos ----------------------------- */
const INK = rgb(0.06, 0.1, 0.14);
const TEXT = rgb(0.12, 0.16, 0.2);
const MUTED = rgb(0.4, 0.45, 0.52);
const LINE = rgb(0.82, 0.85, 0.89);
const ZEBRA = rgb(0.96, 0.97, 0.98);
const ACCENT = rgb(0.04, 0.56, 0.42);
const TONE_COLOR: Record<Tone, ReturnType<typeof rgb>> = {
  infrastructure: rgb(0.28, 0.33, 0.41),
  biological: rgb(0.72, 0.11, 0.11),
  physical: rgb(0.71, 0.33, 0.04),
  vehicle: rgb(0.11, 0.31, 0.85),
};

const W = 595.28, H = 841.89, M = 48, CW = W - M * 2, BOTTOM = 56;

function wrap(font: PDFFont, size: number, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) { line = test; continue; }
      if (line) out.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth) {
        let cut = rest.length;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

/* ------------------------------ Render ------------------------------ */
export async function renderDictamen(input: unknown): Promise<{ bytes: Uint8Array; fileName: string }> {
  const data = parseDictamen(input);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const now = new Date();
  const stamp = now.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long", timeStyle: "short" });
  const folio = `CESVI-${data.expediente}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;

  pdf.setTitle(`Dictamen pericial ${data.expediente}`);
  pdf.setAuthor("CESVI");
  pdf.setCreator("CESVI");
  pdf.setProducer("CESVI · pdf-lib");
  pdf.setCreationDate(now);

  let page!: PDFPage;
  let y = 0;

  const text = (value: string, x: number, yy: number, size = 9.5, font = regular, color = TEXT) =>
    page.drawText(clean(value, 600), { x, y: yy, size, font, color });

  const newPage = (first = false) => {
    page = pdf.addPage([W, H]);
    if (first) {
      page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: INK });
      text("CESVI", M, H - 48, 24, bold, rgb(0.24, 0.89, 0.69));
      text("Dictamen pericial de reconstrucción vial", M, H - 68, 11, regular, rgb(0.85, 0.9, 0.95));
      const label = "EXPEDIENTE";
      text(label, W - M - bold.widthOfTextAtSize(label, 8), H - 40, 8, bold, rgb(0.6, 0.67, 0.75));
      const exp = data.expediente;
      text(exp, W - M - bold.widthOfTextAtSize(exp, 15), H - 58, 15, bold, rgb(1, 1, 1));
      y = H - 96 - 28;
    } else {
      text(`CESVI · Dictamen pericial · ${data.expediente}`, M, H - 32, 8, regular, MUTED);
      page.drawLine({ start: { x: M, y: H - 38 }, end: { x: W - M, y: H - 38 }, thickness: 0.5, color: LINE });
      y = H - 38 - 22;
    }
  };
  const ensure = (height: number) => { if (y - height < BOTTOM) newPage(); };

  const heading = (number: number, title: string) => {
    ensure(48);
    y -= 6;
    page.drawRectangle({ x: M, y: y - 3, width: 3, height: 15, color: ACCENT });
    text(`${number}. ${title}`, M + 10, y, 12, bold, INK);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
    y -= 16;
  };

  const paragraph = (value: string, size = 9.5, color = TEXT, font = regular) => {
    for (const line of wrap(font, size, value, CW)) {
      ensure(size + 5);
      if (line) text(line, M, y, size, font, color);
      y -= size + 4;
    }
  };

  type Col = { title: string; w: number; align?: "right" };
  const table = (cols: Col[], rows: { cells: string[]; tone?: Tone }[]) => {
    const pad = 5, size = 8.5, lead = 11;
    const widths = cols.map((c) => c.w * CW);
    const drawHeader = () => {
      ensure(24);
      page.drawRectangle({ x: M, y: y - 17, width: CW, height: 20, color: INK });
      let x = M;
      cols.forEach((c, i) => {
        const title = c.title.toUpperCase();
        const w = bold.widthOfTextAtSize(title, 7.5);
        text(title, c.align === "right" ? x + widths[i] - pad - w : x + pad, y - 11, 7.5, bold, rgb(0.9, 0.94, 0.97));
        x += widths[i];
      });
      y -= 20;
    };
    drawHeader();
    rows.forEach((row, index) => {
      const lines = row.cells.map((cell, i) => wrap(regular, size, cell || "-", widths[i] - pad * 2));
      const rowH = Math.max(...lines.map((l) => l.length)) * lead + pad * 2 - 2;
      if (y - rowH < BOTTOM) { newPage(); drawHeader(); }
      if (index % 2 === 0) page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: ZEBRA });
      if (row.tone) page.drawRectangle({ x: M, y: y - rowH, width: 2.5, height: rowH, color: TONE_COLOR[row.tone] });
      let x = M;
      lines.forEach((cellLines, i) => {
        cellLines.forEach((line, k) => {
          const w = regular.widthOfTextAtSize(line, size);
          const tx = cols[i].align === "right" ? x + widths[i] - pad - w : x + pad;
          text(line, tx, y - pad - 7 - k * lead + 2, size, i === 0 ? bold : regular, i === 0 ? INK : TEXT);
        });
        x += widths[i];
      });
      y -= rowH;
    });
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
    y -= 14;
  };

  const kind = (e: DictamenElemento) => (e.grupo && e.grupo !== e.clasificacion ? `${e.clasificacion} · ${e.grupo}` : e.clasificacion);
  const empty = (message: string) => paragraph(message, 9, MUTED);

  /* ---------- Página 1 ---------- */
  newPage(true);

  // Datos del expediente
  heading(1, "Datos del expediente");
  const pairs: [string, string][] = [
    ["Título", data.titulo], ["Folio del documento", folio],
    ["Ubicación del siniestro", data.ubicacion], ["Fecha de emisión", stamp],
    ["Perito responsable", data.perito || "Por asignar"], ["Escenas reconstruidas", String(data.escenas.length)],
  ];
  const colW = CW / 2;
  for (let i = 0; i < pairs.length; i += 2) {
    const cells = [pairs[i], pairs[i + 1]];
    const blocks = cells.map((c) => (c ? wrap(regular, 10, c[1], colW - 16) : []));
    const h = 12 + Math.max(...blocks.map((b) => b.length)) * 13 + 6;
    ensure(h);
    cells.forEach((c, k) => {
      if (!c) return;
      const x = M + k * colW;
      text(c[0].toUpperCase(), x, y, 7.5, bold, MUTED);
      blocks[k].forEach((line, n) => text(line, x, y - 13 - n * 13, 10, regular, TEXT));
    });
    y -= h;
  }

  // Resumen
  const evidence = data.elementos.filter((e) => e.categoria === "biological" || e.categoria === "physical");
  const objects = data.elementos.filter((e) => e.categoria === "rigid" || e.categoria === "soft" || e.categoria === "vehicles");
  const metrics: [string, number][] = [["Vehículos", data.vehiculos.length], ["Objetos en escena", objects.length], ["Evidencias", evidence.length], ["Escenas", data.escenas.length]];
  ensure(60);
  y -= 4;
  const mw = (CW - 3 * 8) / 4;
  metrics.forEach(([label, value], i) => {
    const x = M + i * (mw + 8);
    page.drawRectangle({ x, y: y - 40, width: mw, height: 44, color: ZEBRA, borderColor: LINE, borderWidth: 0.5 });
    text(String(value), x + 10, y - 20, 17, bold, ACCENT);
    text(label.toUpperCase(), x + 10, y - 34, 7, bold, MUTED);
  });
  y -= 62;

  // Cronología
  heading(2, "Cronología de escenas");
  if (data.escenas.length === 0) empty("No se registraron escenas.");
  else table([{ title: "N.º", w: 0.1 }, { title: "Escena", w: 0.9 }], data.escenas.map((s, i) => ({ cells: [String(i + 1).padStart(2, "0"), s] })));

  // Vehículos
  heading(3, "Vehículos involucrados");
  if (data.vehiculos.length === 0) empty("No hay vehículos registrados.");
  else table(
    [{ title: "Unidad", w: 0.1 }, { title: "Modelo", w: 0.28 }, { title: "Tipo", w: 0.14 }, { title: "Vel. (km/h)", w: 0.16, align: "right" }, { title: "Dirección", w: 0.16 }, { title: "Frenado (m)", w: 0.16, align: "right" }],
    data.vehiculos.map((v) => ({ cells: [v.etiqueta, v.modelo, v.tipo, String(v.velocidadKmh), v.direccion, String(v.frenadoM)], tone: "vehicle" as Tone })),
  );

  // Objetos
  heading(4, "Objetos en escena");
  if (objects.length === 0) empty("No se agregaron objetos desde el catálogo.");
  else table(
    [{ title: "Elemento", w: 0.24 }, { title: "Clasificación", w: 0.22 }, { title: "Escena", w: 0.14 }, { title: "Propiedades base", w: 0.4 }],
    objects.map((e) => ({ cells: [e.etiqueta, kind(e), e.escena, e.propiedades], tone: e.tone })),
  );

  // Evidencia
  heading(5, "Evidencia registrada");
  if (evidence.length === 0) empty("No se registró evidencia biológica ni física.");
  else table(
    [{ title: "Evidencia", w: 0.24 }, { title: "Tipo", w: 0.22 }, { title: "Escena", w: 0.14 }, { title: "Propiedades base", w: 0.4 }],
    evidence.map((e) => ({ cells: [e.etiqueta, kind(e), e.escena, e.propiedades], tone: e.tone })),
  );

  // Observaciones
  heading(6, "Observaciones y conclusiones");
  if (data.observaciones) paragraph(data.observaciones);
  else {
    paragraph("Sin observaciones capturadas. Las propiedades indicadas son valores base de referencia y deben validarse con las mediciones realizadas en campo.", 9, MUTED);
  }

  // Firma
  ensure(110);
  y -= 30;
  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.7, color: INK });
  text("Nombre y firma del perito", M, y - 12, 8.5, regular, MUTED);
  if (data.perito) text(data.perito, M, y - 25, 9.5, bold, INK);
  page.drawLine({ start: { x: W - M - 160, y }, end: { x: W - M, y }, thickness: 0.7, color: INK });
  text("Fecha", W - M - 160, y - 12, 8.5, regular, MUTED);
  y -= 40;

  /* ---------- Pies de página ---------- */
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: LINE });
    p.drawText(clean(`${folio} · Documento generado por CESVI; requiere revisión y firma del perito.`, 160), { x: M, y: 28, size: 7.5, font: regular, color: MUTED });
    const label = `Página ${i + 1} de ${pages.length}`;
    p.drawText(label, { x: W - M - regular.widthOfTextAtSize(label, 7.5), y: 28, size: 7.5, font: regular, color: MUTED });
  });

  const safeName = data.expediente.replace(/[^A-Za-z0-9_-]/g, "_");
  return { bytes: await pdf.save(), fileName: `dictamen-${safeName}.pdf` };
}
