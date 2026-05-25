// ============================================================
// Supabase client initialization
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Allowed email domain
export const ALLOWED_DOMAIN = 'svejda-goldmann.cz';

export function isAllowedEmail(email: string): boolean {
  return email.endsWith(`@${ALLOWED_DOMAIN}`);
}
