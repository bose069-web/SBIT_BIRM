import type { AuthPort } from '@/core/ports/auth-port';
import { AuthMemory } from '@/infrastructure/memory/auth-memory';
import { AuthSupabase } from '@/infrastructure/supabase/auth-supabase';
import { crearClienteSupabase } from '@/infrastructure/supabase/client';

/**
 * Composition root: el único sitio que decide qué adaptador usa la app.
 * Para cambiar de backend se toca este archivo (o la variable EXPO_PUBLIC_BACKEND), nunca el núcleo ni la UI.
 */
function crearAuth(): AuthPort {
  const backend = process.env.EXPO_PUBLIC_BACKEND ?? 'memory';

  if (backend === 'supabase') {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const clave = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    if (url && clave) {
      return new AuthSupabase(crearClienteSupabase(url, clave));
    }
    console.warn(
      'EXPO_PUBLIC_BACKEND=supabase pero faltan URL o clave; se usa el backend en memoria.',
    );
  }

  return new AuthMemory();
}

export const container = {
  auth: crearAuth(),
};
