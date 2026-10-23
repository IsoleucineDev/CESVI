export type Scene = {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type CaseContext = {
  id: string;
  name: string;
  location: string;
  status: "active";
  scenes: Scene[];
};

const now = () => new Date().toISOString();

const seedScenes = (caseId: string): Scene[] =>
  ["Inicio", "Aproximación", "Impacto", "Posición final"].map((name, order) => ({
    id: `${caseId}-scene-${order + 1}`,
    name,
    order,
    createdAt: now(),
    updatedAt: now(),
  }));

const cases = new Map<string, CaseContext>();

export function getCase(caseId: string): CaseContext {
  const existing = cases.get(caseId);
  if (existing) return existing;

  const created: CaseContext = {
    id: caseId,
    name: "Colisión en Av. Reforma",
    location: "Av. Paseo de la Reforma 222, Ciudad de México",
    status: "active",
    scenes: seedScenes(caseId),
  };
  cases.set(caseId, created);
  return created;
}

export function updateScenes(caseId: string, scenes: Scene[]) {
  const record = getCase(caseId);
  record.scenes = scenes
    .map((scene, order) => ({ ...scene, order, updatedAt: now() }))
    .sort((a, b) => a.order - b.order);
}

export function createScene(caseId: string, name: string, order: number): Scene {
  const record = getCase(caseId);
  const timestamp = now();
  const scene: Scene = {
    id: `${caseId}-scene-${crypto.randomUUID()}`,
    name,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateScenes(caseId, [...record.scenes, scene]);
  return scene;
}

export function findScene(caseId: string, sceneId: string): Scene | undefined {
  return getCase(caseId).scenes.find((scene) => scene.id === sceneId);
}

export function findSceneAcrossCases(sceneId: string): { caseId: string; scene: Scene } | undefined {
  for (const [caseId, record] of cases) {
    const scene = record.scenes.find((item) => item.id === sceneId);
    if (scene) return { caseId, scene };
  }
  return undefined;
}
