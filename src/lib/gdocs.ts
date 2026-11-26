// ============================================================
// Založení Google Docu s nabídkou: kopie Šablony ŠG do složky nabídek,
// řádek {{obsah}} v kopii se nahradí nabídkou (Docs API).
// Token přes Google Identity Services (jen v prohlížeči). Scope drive: šablona i složka
// patří sdílenému účtu ŠG, drive.file by k nim aplikaci nepustil.
// ============================================================

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPE = 'https://www.googleapis.com/auth/drive';
// Šablona ŠG a složka „3. Cost Estimate“ v Disku účtu Š–G Kancelář
const TEMPLATE_DOC_ID = '1sOTgjBpLOAPk8gaokmfBFVhPkULsHHzzmR8JKkld7DI';
const OFFERS_FOLDER_ID = '1i_mkcQf0YX4-GplqEPdJQ00Z9XPv9WAb';
const CONTENT_MARKER = '{{obsah}}';
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

// Volání Google API s tokenem; chyba se vrátí jako čitelná výjimka
async function googleFetch(token: string, url: string, body: unknown, what: string) {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) cachedToken = null;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${what} (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res.json();
}

interface DocElement {
  startIndex: number;
  endIndex: number;
  paragraph?: { elements: { textRun?: { content: string } }[] };
}

export async function createGoogleDoc(
  name: string,
  email: string,
  contentRequests: (at: number) => Record<string, unknown>[],
): Promise<CreatedDoc> {
  const token = await getAccessToken(email);

  const copy = await googleFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_DOC_ID}/copy?supportsAllDrives=true&fields=id,webViewLink`,
    { name, parents: [OFFERS_FOLDER_ID] },
    'Nepodařilo se zkopírovat Šablonu ŠG',
  );
  const doc = { id: copy.id as string, url: copy.webViewLink as string };

  const content = await googleFetch(
    token,
    `https://docs.googleapis.com/v1/documents/${doc.id}`,
    undefined,
    'Nepodařilo se načíst kopii šablony',
  );
  const elements: DocElement[] = content.body.content;
  const marker = elements.find((el) =>
    el.paragraph?.elements.some((e) => e.textRun?.content.includes(CONTENT_MARKER)),
  );
  if (!marker) {
    throw new Error(`V Šabloně ŠG chybí řádek ${CONTENT_MARKER}, dokument ${doc.url} zůstal bez obsahu.`);
  }
  const bodyEnd = elements[elements.length - 1].endIndex;
  const at = marker.startIndex;

  // Smazat značku a vše pod ní (ukázky stylů), zbude poslední prázdný odstavec; do něj se vloží nabídka
  await googleFetch(
    token,
    `https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`,
    {
      requests: [
        { deleteContentRange: { range: { startIndex: at, endIndex: bodyEnd - 1 } } },
        { updateParagraphStyle: { range: { startIndex: at, endIndex: at + 1 }, paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }, fields: 'namedStyleType' } },
        ...contentRequests(at),
      ],
    },
    `Nepodařilo se vložit nabídku do dokumentu ${doc.url}`,
  );
  return doc;
}
