import './local-storage';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function crearClienteSupabase(url: string, clave: string): SupabaseClient {
  return createClient(url, clave, {
    auth: {
      // undefined durante el renderizado estático de la web (no hay navegador); Supabase lo gestiona.
      storage: typeof localStorage === 'undefined' ? undefined : localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
