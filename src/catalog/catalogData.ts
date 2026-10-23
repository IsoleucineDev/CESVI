/**
 * Catálogo de Elementos y Evidencia (Cesvi2).
 * Datos puros (sin React) para poder reutilizarlos en backend o agentes.
 * Cada elemento trae propiedades base editables (Ley de Tesler): masa, dimensiones y fricción.
 */

export type CatalogCategory = "rigid" | "soft" | "biological" | "physical" | "vehicles";
export type CatalogTone = "infrastructure" | "biological" | "physical" | "vehicle";

export type IconKey =
  | "wall" | "fence" | "sign" | "pole" | "building" | "tree" | "rock" | "beam" | "tire"
  | "car" | "carfront" | "truck" | "bus" | "moto" | "scooter" | "bike" | "tractor" | "wrench"
  | "caravan" | "container" | "user" | "paw" | "droplet" | "droplets" | "bone" | "route"
  | "footprints" | "hammer" | "package" | "glass" | "fuel" | "gem";

export type ElementDefaults = {
  massKg?: number;
  lengthM?: number;
  widthM?: number;
  areaM2?: number;
  frictionMu?: number;
  note?: string;
};

export type CatalogItem = {
  id: string;
  category: CatalogCategory;
  group: string;
  label: string;
  detail: string;
  icon: IconKey;
  tone: CatalogTone;
  defaults: ElementDefaults;
};

export type SceneElement = {
  uid: string;
  catalogId: string;
  label: string;
  group: string;
  category: CatalogCategory;
  tone: CatalogTone;
  scene: string;
  defaults: ElementDefaults;
};

/** 5 categorías principales (Hick / Miller: máximo 5-6 pestañas). */
export const CATALOG_TABS: { id: CatalogCategory; label: string; parent: string; tone: CatalogTone; icon: IconKey }[] = [
  { id: "rigid", label: "Rígidos", parent: "A · Objetos duros o rígidos", tone: "infrastructure", icon: "wall" },
  { id: "soft", label: "Blandos", parent: "A · Objetos o cuerpos blandos", tone: "biological", icon: "user" },
  { id: "biological", label: "Biológica", parent: "B · Evidencia biológica", tone: "biological", icon: "droplet" },
  { id: "physical", label: "Física", parent: "B · Evidencia física", tone: "physical", icon: "route" },
  { id: "vehicles", label: "Vehículos", parent: "C · Tipos de vehículo", tone: "vehicle", icon: "car" },
];

export const CATEGORY_LABEL: Record<CatalogCategory, string> = {
  rigid: "Objeto rígido",
  soft: "Cuerpo blando",
  biological: "Evidencia biológica",
  physical: "Evidencia física",
  vehicles: "Vehículo",
};

type Row = [id: string, label: string, detail: string, defaults?: ElementDefaults, icon?: IconKey];

const block = (category: CatalogCategory, group: string, tone: CatalogTone, icon: IconKey, rows: Row[]): CatalogItem[] =>
  rows.map(([id, label, detail, defaults, rowIcon]) => ({
    id,
    category,
    group,
    tone,
    label,
    detail,
    icon: rowIcon ?? icon,
    defaults: defaults ?? {},
  }));

const veh = (massKg: number, lengthM: number, widthM: number, frictionMu = 0.75): ElementDefaults => ({ massKg, lengthM, widthM, frictionMu });
const fixed = (lengthM: number, widthM: number, frictionMu = 0.6, massKg?: number): ElementDefaults => ({ lengthM, widthM, frictionMu, massKg });

export const catalogItems: CatalogItem[] = [
  /* ---------- A. OBJETOS · duros o rígidos ---------- */
  ...block("rigid", "Infraestructura vial fija", "infrastructure", "wall", [
    ["wall-protection", "Muro de protección", "Muro o pretil de contención lateral.", fixed(4, 0.6, 0.6, 2400)],
    ["guardrail", "Barandilla / guardarraíl", "Barrera metálica continua de borde de calzada.", fixed(4, 0.3, 0.35), "fence"],
    ["safety-barrier", "Barrera de seguridad", "Barrera de hormigón o metálica de separación.", fixed(3, 0.6, 0.6, 1800)],
    ["traffic-sign", "Señal de tráfico", "Señal vertical con poste.", fixed(0.8, 0.8, 0.4, 25), "sign"],
    ["pole", "Poste", "Poste de alumbrado, semáforo o servicios.", fixed(0.3, 0.3, 0.5, 350), "pole"],
    ["pillar", "Pilar", "Pilar o columna de estructura.", fixed(1, 1, 0.6, 3500), "pole"],
    ["metal-profile", "Perfil metálico", "Perfil o poste metálico de sujeción.", fixed(2, 0.15, 0.4, 60), "beam"],
    ["edge-marker", "Hito de borde", "Delineador o hito de arista.", fixed(0.2, 0.2, 0.4, 5), "pole"],
    ["curb", "Bordillo", "Bordillo o guarnición de acera.", fixed(3, 0.2, 0.6, 450)],
    ["building", "Edificio", "Fachada o construcción colindante.", fixed(10, 8, 0.6), "building"],
  ]),
  ...block("rigid", "Naturales y desprendidos en la vía", "infrastructure", "tree", [
    ["tree", "Árbol", "Árbol en calzada o arcén.", fixed(0.5, 0.5, 0.7, 400)],
    ["rock", "Roca", "Roca o piedra desprendida.", fixed(0.8, 0.8, 0.7, 500), "rock"],
    ["beam", "Viga", "Viga desprendida sobre la calzada.", fixed(4, 0.3, 0.6, 250), "beam"],
    ["trunk", "Tronco", "Tronco caído o atravesado.", fixed(3, 0.4, 0.7, 200), "pole"],
    ["abandoned-tire", "Neumático abandonado", "Neumático suelto sobre la vía.", fixed(0.7, 0.25, 0.8, 12), "tire"],
  ]),
  ...block("rigid", "Vehículos estáticos", "vehicle", "car", [
    ["static-parked", "Vehículo estacionado", "Estacionado en calzada o arcén.", veh(1400, 4.5, 1.8)],
    ["static-stopped", "Vehículo detenido", "Detenido sobre la calzada.", veh(1400, 4.5, 1.8)],
    ["static-abandoned", "Vehículo abandonado", "Abandonado en calzada o arcén.", veh(1400, 4.5, 1.8, 0.7)],
  ]),

  /* ---------- A. OBJETOS · blandos ---------- */
  ...block("soft", "Cuerpos humanos", "biological", "user", [
    ["human-pedestrian", "Peatón", "Persona a pie.", { massKg: 75, lengthM: 0.5, widthM: 0.3, frictionMu: 0.5 }],
    ["human-cyclist", "Ciclista", "Persona en bicicleta.", { massKg: 90, lengthM: 1.8, widthM: 0.6, frictionMu: 0.5 }, "bike"],
    ["human-motorcyclist", "Motociclista", "Conductor o pasajero de motocicleta.", { massKg: 85, lengthM: 0.6, widthM: 0.4, frictionMu: 0.5 }, "moto"],
    ["human-occupant", "Ocupante de vehículo", "Conductor o pasajero de un vehículo.", { massKg: 75, lengthM: 0.5, widthM: 0.4, frictionMu: 0.5 }],
  ]),
  ...block("soft", "Cuerpos animales", "biological", "paw", [
    ["animal-wildlife", "Fauna silvestre", "Animal silvestre (venado, coyote, etc.).", { massKg: 60, lengthM: 1.5, widthM: 0.4, frictionMu: 0.45 }],
    ["animal-livestock", "Ganado", "Bovinos, equinos u otro ganado.", { massKg: 450, lengthM: 2.2, widthM: 0.7, frictionMu: 0.45 }],
  ]),

  /* ---------- B. EVIDENCIA · biológica ---------- */
  ...block("biological", "Evidencia biológica", "biological", "droplet", [
    ["bio-blood", "Sangre", "Manchas, proyecciones y charcos.", { areaM2: 0.3, note: "Estado: líquido · Registro fotográfico" }],
    ["bio-tissue", "Tejidos y restos corporales", "Restos orgánicos separados del cuerpo.", { massKg: 0.2, note: "Muestra etiquetada" }, "bone"],
  ]),

  /* ---------- B. EVIDENCIA · física ---------- */
  ...block("physical", "Huellas de neumático", "physical", "route", [
    ["tire-braking", "Frenado", "Marca de bloqueo de ruedas.", { lengthM: 8, frictionMu: 0.7 }],
    ["tire-drag", "Arrastre", "Marca de arrastre.", { lengthM: 6, frictionMu: 0.55 }],
    ["tire-skid", "Derrape", "Marca de derrape lateral.", { lengthM: 10, frictionMu: 0.6 }],
    ["tire-accel", "Aceleración", "Marca de aceleración brusca.", { lengthM: 4, frictionMu: 0.7 }],
    ["tire-rolling", "Rodadura simple", "Marca de rodadura sin bloqueo.", { lengthM: 12, note: "Sin deslizamiento" }, "footprints"],
  ]),
  ...block("physical", "Marcas y trazas de pavimento", "physical", "hammer", [
    ["pave-scratch", "Arañazo", "Línea fina sobre el pavimento.", { lengthM: 0.6, note: "Prof.: 0,002 m" }],
    ["pave-scuff", "Rozadura", "Abrasión superficial.", { lengthM: 0.8, note: "Prof.: 0,005 m" }],
    ["pave-gouge", "Surco", "Surco o hendidura.", { lengthM: 0.5, note: "Prof.: 0,02 m" }],
    ["pave-dig", "Excavación", "Material removido por impacto.", { lengthM: 0.4, widthM: 0.3, note: "Prof.: 0,03 m" }],
    ["pave-pothole", "Bache", "Bache previo en el pavimento.", { lengthM: 0.4, widthM: 0.4, note: "Prof.: 0,05 m" }],
  ]),
  ...block("physical", "Fragmentos y autopartes", "physical", "package", [
    ["frag-plastic", "Plásticos", "Fragmentos plásticos de carrocería.", { massKg: 0.3, note: "Origen: por identificar" }],
    ["frag-fibers", "Fibras", "Fibras textiles o de pintura.", { massKg: 0.01, note: "Muestra etiquetada" }],
    ["frag-trim", "Molduras", "Molduras y adornos.", { massKg: 0.5, note: "Origen: por identificar" }],
    ["frag-bumper", "Parachoques", "Parachoques o fascia desprendida.", { massKg: 8, lengthM: 1.6, widthM: 0.4 }],
    ["frag-mechanical", "Piezas mecánicas", "Piezas mecánicas desprendidas.", { massKg: 5, note: "Origen: por identificar" }, "wrench"],
  ]),
  ...block("physical", "Vidrio y restos de ventanas", "physical", "glass", [
    ["glass-windshield", "Parabrisas (laminado)", "Dispersión de vidrio laminado.", { areaM2: 6, note: "Tipo: laminado" }],
    ["glass-window", "Lunas laterales (templado)", "Dispersión de vidrio templado.", { areaM2: 8, note: "Tipo: templado" }, "gem"],
    ["glass-headlight", "Faros", "Restos de óptica o faros.", { areaM2: 2, note: "Tipo: policarbonato / vidrio" }],
  ]),
  ...block("physical", "Fluidos y aceites", "physical", "droplets", [
    ["fluid-oil", "Aceite de motor", "Derrame de aceite de motor.", { areaM2: 1.5, note: "Color: oscuro" }],
    ["fluid-brake", "Líquido de frenos", "Derrame de líquido de frenos.", { areaM2: 0.3 }],
    ["fluid-coolant", "Refrigerante", "Derrame de refrigerante.", { areaM2: 1.2 }],
    ["fluid-fuel", "Combustible", "Derrame de combustible.", { areaM2: 2.4, note: "Riesgo de ignición" }, "fuel"],
  ]),

  /* ---------- C. TIPOS DE VEHÍCULO ---------- */
  ...block("vehicles", "Turismos y vehículos ligeros", "vehicle", "car", [
    ["v-sedan", "Sedán / Saloon", "Turismo de tres volúmenes.", veh(1400, 4.6, 1.8)],
    ["v-coupe", "Coupé", "Turismo de dos puertas.", veh(1350, 4.5, 1.85)],
    ["v-cabrio", "Cabrio / Descapotable", "Turismo convertible.", veh(1450, 4.5, 1.85)],
    ["v-estate", "Estate / Familiar", "Turismo familiar con maletero ampliado.", veh(1550, 4.7, 1.85)],
    ["v-utility", "Utility / Micro", "Utilitario compacto.", veh(950, 3.7, 1.7)],
    ["v-mpv", "MPV / Monovolumen", "Monovolumen.", veh(1750, 4.6, 1.85)],
    ["v-offroad", "Todoterreno 4x4", "Todoterreno.", veh(2000, 4.5, 1.9, 0.7), "carfront"],
    ["v-suv", "SUV", "Vehículo utilitario deportivo.", veh(1900, 4.7, 1.9), "carfront"],
  ]),
  ...block("vehicles", "Comerciales, industriales y de carga", "vehicle", "truck", [
    ["v-van", "Furgoneta (Van)", "Vehículo comercial ligero.", veh(2300, 5.4, 2), "car"],
    ["v-pickup", "Pick-up", "Camioneta de caja abierta.", veh(2200, 5.3, 1.95), "car"],
    ["v-rigid-4x2", "Camión rígido 4x2", "Camión de dos ejes.", veh(8000, 8, 2.5, 0.65)],
    ["v-rigid-6x4", "Camión rígido 6x4", "Camión de tres ejes.", veh(15000, 9, 2.5, 0.65)],
    ["v-rigid-8x4", "Camión rígido 8x4", "Camión de cuatro ejes.", veh(20000, 10, 2.5, 0.65)],
    ["v-tractor-unit", "Tractora / Cabeza tractora", "Tractocamión sin remolque.", veh(9000, 6, 2.5, 0.65)],
    ["v-trailer", "Remolque y semirremolque", "Remolque o semirremolque.", veh(7000, 13.6, 2.55, 0.65), "container"],
    ["v-road-train", "Tren de carretera", "Tractora con remolques en tándem.", veh(40000, 25, 2.55, 0.6)],
  ]),
  ...block("vehicles", "Transporte de pasajeros", "vehicle", "bus", [
    ["v-minibus", "Minibús", "Autobús pequeño.", veh(5000, 7, 2.1, 0.7)],
    ["v-bus-standard", "Autobús estándar", "Autobús interurbano estándar.", veh(12000, 12, 2.55, 0.65)],
    ["v-bus-urban", "Autobús urbano", "Autobús de transporte urbano.", veh(11000, 12, 2.55, 0.65)],
    ["v-coach", "Autocar", "Autobús de larga distancia.", veh(14000, 13, 2.55, 0.65)],
    ["v-bus-articulated", "Autobús articulado", "Autobús de dos cuerpos.", veh(17000, 18, 2.55, 0.65)],
  ]),
  ...block("vehicles", "Motocicletas y ciclomotores", "vehicle", "moto", [
    ["v-moto-touring", "Carretera · Touring", "Motocicleta de turismo.", veh(250, 2.2, 0.9, 0.8)],
    ["v-moto-sport", "Carretera · Sport", "Motocicleta deportiva.", veh(200, 2.1, 0.7, 0.85)],
    ["v-moto-custom", "Carretera · Custom", "Motocicleta custom.", veh(280, 2.3, 0.9, 0.8)],
    ["v-moto-motocross", "Off-road · Motocross", "Motocicleta de motocross.", veh(105, 2.1, 0.8, 0.7)],
    ["v-moto-enduro", "Off-road · Enduro", "Motocicleta de enduro.", veh(115, 2.1, 0.8, 0.7)],
    ["v-moto-trail", "Mixta · Trail", "Motocicleta trail.", veh(190, 2.2, 0.85, 0.75)],
    ["v-scooter", "Urbana · Scooter", "Scooter urbano.", veh(130, 1.9, 0.7, 0.75), "scooter"],
    ["v-moped", "Urbana · Ciclomotor", "Ciclomotor.", veh(90, 1.8, 0.65, 0.7), "scooter"],
  ]),
  ...block("vehicles", "Otros vehículos", "vehicle", "tractor", [
    ["v-agri", "Maquinaria agrícola", "Tractor o maquinaria agrícola.", veh(6000, 5, 2.5, 0.6)],
    ["v-works", "Maquinaria de obras", "Maquinaria de obra pública.", veh(12000, 7, 2.6, 0.55), "wrench"],
    ["v-bicycle", "Bicicleta", "Vehículo no autopropulsado.", veh(14, 1.8, 0.6, 0.6), "bike"],
    ["v-animal-cart", "Carro de tracción animal", "Vehículo no autopropulsado.", veh(300, 3, 1.5, 0.5), "caravan"],
  ]),
];

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

/** Resumen legible de las propiedades base (también lo usa el PDF). */
export function describeDefaults(d: ElementDefaults): string {
  const parts: string[] = [];
  if (d.massKg !== undefined) parts.push(`Masa ${nf.format(d.massKg)} kg`);
  if (d.lengthM !== undefined) parts.push(d.widthM !== undefined ? `${nf.format(d.lengthM)} × ${nf.format(d.widthM)} m` : `Long. ${nf.format(d.lengthM)} m`);
  if (d.areaM2 !== undefined) parts.push(`Área ${nf.format(d.areaM2)} m²`);
  if (d.frictionMu !== undefined) parts.push(`μ ${nf.format(d.frictionMu)}`);
  if (d.note) parts.push(d.note);
  return parts.join(" · ") || "Sin propiedades base";
}
