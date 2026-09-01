/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_PHONE?: string;
  readonly VITE_HACKATHON_OTP_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
