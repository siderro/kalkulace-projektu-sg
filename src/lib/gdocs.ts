// ============================================================
// Založení Google Docu s nabídkou v Disku přihlášeného uživatele
// Token přes Google Identity Services (jen v prohlížeči, scope drive.file =
// aplikace vidí jen soubory, které sama založí), upload HTML s konverzí na Google Doc.
// ============================================================

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

// Knihovnu Google načteme až při prvním použití (aby se nestahovala při každém otevření aplikace)
export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoading = null;
        reject(new Error('Nepodařilo se načíst přihlášení Google.'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

function getAccessToken(email: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return Promise.resolve(cachedToken.value);
  }
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error('Přihlášení Google ještě není načtené, zkuste to znovu.'));
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      hint: email,
      callback: () => {},
    });
  }
  const client = tokenClient;
  return new Promise((resolve, reject) => {
    client.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      cachedToken = { value: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
      resolve(response.access_token);
    };
    client.error_callback = (error) => {
      reject(new Error(error.type === 'popup_closed' ? 'Okno přihlášení Google bylo zavřeno.' : error.message || error.type));
    };
    client.requestAccessToken({ prompt: '' });
  });
}

export interface CreatedDoc {
  id: string;
  url: string;
}

export async function createGoogleDoc(html: string, name: string, email: string): Promise<CreatedDoc> {
  const token = await getAccessToken(email);
  const metadata = { name, mimeType: 'application/vnd.google-apps.document' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([html], { type: 'text/html' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (res.status === 401) cachedToken = null;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google Disk odmítl dokument (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return { id: data.id, url: data.webViewLink };
}
