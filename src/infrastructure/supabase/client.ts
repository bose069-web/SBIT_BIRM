import './local-storage';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de un solo uso para crear cuentas ajenas: guarda la sesión de la cuenta nueva en memoria,
 * así que nunca pisa la del usuario que la crea. Con otra clave para no compartir nada con el principal.
 */
export function crearClienteTemporal(url: string, clave: string): SupabaseClient {
  return createClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'kampus-alta-temporal',
    },
  });
}

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
