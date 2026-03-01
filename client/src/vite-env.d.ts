/// <reference types="vite/client" />

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(input: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_SPACETIMEDB_MODULE: string;
  readonly VITE_SPACETIMEDB_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
