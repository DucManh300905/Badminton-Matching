/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ API backend, vd http://localhost:8080/api */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
