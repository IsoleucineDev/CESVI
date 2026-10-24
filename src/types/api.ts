export type Scene = {
  id?: string;
  name: string;
  order?: number;
};

export type CaseContext = {
  id: string;
  name?: string;
  location?: string;
  scenes?: Scene[];
  [key: string]: unknown;
};

export type ApiError = Error & { status?: number };

export type Action =
  | { type: "set_location"; query: string }
  | { type: "set_vehicle_type"; vehicleId: string; value: "Automóvil" | "Carga" | "Motocicleta" | "Otro" }
  | { type: "set_speed"; vehicleId: string; value: number }
  | { type: "set_braking"; vehicleId: string; value: number }
  | { type: "rotate_element"; vehicleId: string; heading: string }
  | { type: "move_vehicle"; vehicleId: string; lat: number; lng: number }
  | { type: "focus_scene_area"; lat: number; lng: number; zoom: number }
  | { type: "set_impact_point"; lat?: number; lng?: number };

export type AssistantTopic = { name: string; done: boolean };

export type AssistantMessageResponse = {
  answer: string;
  actions: Action[];
  quickReplies: string[];
  progress: number;
  ready: boolean;
  topics: AssistantTopic[];
  missing: string[];
};
