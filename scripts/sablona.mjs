// ============================================================
// Nahraje šablonu nabídky (sablona/nabidka.md) do Supabase.
//   npm run sablona          nahrát a ověřit
//   npm run sablona stahni   vypsat šablonu a texty z global_settings, co jsou teď v databázi
// Potřebuje SUPABASE_SERVICE_ROLE_KEY v .env.local (mimo git, obchází RLS).
// ============================================================

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Chybí VITE_SUPABASE_URL (.env) nebo SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const file = new URL('../sablona/nabidka.md', import.meta.url);

if (process.argv[2] === 'stahni') {
  const { data: settings, error } = await supabase.from('global_settings').select('*').limit(1).single();
  if (error) throw error;
  const { data: template } = await supabase.from('offer_templates').select('content').eq('key', 'nabidka').maybeSingle();
  console.log(JSON.stringify({ settings, template: template?.content ?? null }, null, 2));
} else {
  const content = readFileSync(file, 'utf8');
  const { error } = await supabase
    .from('offer_templates')
    .upsert({ key: 'nabidka', content, updated_at: new Date().toISOString() });
  if (error) throw error;

  const { data, error: readError } = await supabase.from('offer_templates').select('content').eq('key', 'nabidka').single();
  if (readError) throw readError;
  if (data.content !== content) {
    console.error('Šablona v databázi se neshoduje s nahraným souborem.');
    process.exit(1);
  }
  console.log(`Šablona nahraná (${content.length} znaků). V aplikaci se projeví po obnovení stránky.`);
}
