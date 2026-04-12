import { useState, useEffect } from 'react';
import { supabase, isAllowedEmail } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email ?? '';
        if (isAllowedEmail(email)) {
          setUser(session.user);
        } else {
          setError(`Přístup zamítnut pro ${email}. Povolená doména: svejda-goldmann.cz`);
          supabase.auth.signOut();
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const email = session.user.email ?? '';
          if (isAllowedEmail(email)) {
            setUser(session.user);
            setError(null);
          } else {
            setError(`Přístup zamítnut pro ${email}. Povolená doména: svejda-goldmann.cz`);
            supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          hd: 'svejda-goldmann.cz', // Hint for Google to show only this domain
        },
      },
    });
    if (error) setError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, error, signIn, signOut };
}
