// ============================================================
// ARES (registr ekonomických subjektů MF ČR) — údaje firmy podle IČO
// ============================================================

export interface AresCompany {
  name: string;
  address: string;
  dic: string;
}

export async function fetchAresCompany(ico: string): Promise<AresCompany> {
  const normalized = ico.replace(/\s/g, '').padStart(8, '0');
  if (!/^\d{8}$/.test(normalized)) throw new Error('IČO musí mít 8 číslic.');
  const res = await fetch(
    `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${normalized}`,
  );
  if (res.status === 404) throw new Error('Firma s tímto IČO v ARES není.');
  if (!res.ok) throw new Error(`ARES neodpovídá (${res.status}).`);
  const data = await res.json();
  return {
    name: data.obchodniJmeno ?? '',
    address: data.sidlo?.textovaAdresa ?? '',
    dic: data.dic ?? '',
  };
}
