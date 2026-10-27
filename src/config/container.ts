import type { AuthPort } from '@/core/ports/auth-port';
import type { DossierPort } from '@/core/ports/dossier-port';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';
import type { ValoracionPort } from '@/core/ports/valoracion-port';
import { AuthMemory } from '@/infrastructure/memory/auth-memory';
import { DossierMemory } from '@/infrastructure/memory/dossier-memory';
import { RegistroDiarioMemory } from '@/infrastructure/memory/registro-diario-memory';
import { ValoracionMemory } from '@/infrastructure/memory/valoracion-memory';
import { AuthSupabase } from '@/infrastructure/supabase/auth-supabase';
import { crearClienteSupabase } from '@/infrastructure/supabase/client';
import { DossierSupabase } from '@/infrastructure/supabase/dossier-supabase';
import { RegistroDiarioSupabase } from '@/infrastructure/supabase/registro-diario-supabase';
import { ValoracionSupabase } from '@/infrastructure/supabase/valoracion-supabase';

interface Container {
  auth: AuthPort;
  dossiers: DossierPort;
  registros: RegistroDiarioPort;
  valoraciones: ValoracionPort;
}

/**
 * Composition root: el único sitio que decide qué adaptador usa la app.
 * Para cambiar de backend se toca este archivo (o la variable EXPO_PUBLIC_BACKEND), nunca el núcleo ni la UI.
 */
function crearContainer(): Container {
  const backend = process.env.EXPO_PUBLIC_BACKEND ?? 'memory';

  if (backend === 'supabase') {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const clave = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    if (url && clave) {
      // Un solo cliente para todos: comparten la sesión del usuario.
      const cliente = crearClienteSupabase(url, clave);
      return {
        auth: new AuthSupabase(cliente),
        dossiers: new DossierSupabase(cliente),
        registros: new RegistroDiarioSupabase(cliente),
        valoraciones: new ValoracionSupabase(cliente),
      };
    }
    console.warn(
      'EXPO_PUBLIC_BACKEND=supabase pero faltan URL o clave; se usa el backend en memoria.',
    );
  }

  const auth = new AuthMemory();
  return {
    auth,
    dossiers: new DossierMemory(),
    registros: new RegistroDiarioMemory(),
    valoraciones: new ValoracionMemory(auth),
  };
}

export const container = crearContainer();
