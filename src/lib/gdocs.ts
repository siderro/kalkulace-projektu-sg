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
            error_callback: (error: { type: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;
// Když Google do minuty neodpoví (okno zablokované nebo nechané otevřené), export se ukončí chybou
const TOKEN_TIMEOUT_MS = 60_000;
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
  const oauth2 = window.google.accounts.oauth2;
  // Klient se zakládá pro každý požadavek: callbacky musí dostat Google hned při vytvoření
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Google neodpověděl. Zkontrolujte, jestli prohlížeč nezablokoval vyskakovací okno.')),
      TOKEN_TIMEOUT_MS,
    );
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      hint: email,
      callback: (response) => {
        clearTimeout(timer);
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
        resolve(response.access_token);
      },
      error_callback: (error) => {
        clearTimeout(timer);
        reject(new Error(
          error.type === 'popup_closed' ? 'Okno přihlášení Google bylo zavřeno.'
            : error.type === 'popup_failed_to_open' ? 'Prohlížeč zablokoval okno přihlášení Google – povolte vyskakovací okna pro tuto stránku.'
            : error.message || error.type,
        ));
      },
    });
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
