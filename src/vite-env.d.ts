/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CASE_ID?: string;
  readonly VITE_API_TOKEN?: string;
  readonly VITE_SCENES_API_BASE_URL?: string;
  readonly VITE_AI_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
