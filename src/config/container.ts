import type { AuthPort } from '@/core/ports/auth-port';
import type { BorradorPort } from '@/core/ports/borrador-port';
import type { ChatPort } from '@/core/ports/chat-port';
import type { DossierPort } from '@/core/ports/dossier-port';
import type { EventoPort } from '@/core/ports/evento-port';
import type { GestionCentroPort } from '@/core/ports/gestion-centro-port';
import type { IncidenciaPort } from '@/core/ports/incidencia-port';
import type { InformePort } from '@/core/ports/informe-port';
import type { PerfilPort } from '@/core/ports/perfil-port';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';
import type { TareaPort } from '@/core/ports/tarea-port';
import type { ValoracionPort } from '@/core/ports/valoracion-port';
import { BorradorLocalStorage } from '@/infrastructure/dispositivo/borrador-local-storage';
import { AuthMemory } from '@/infrastructure/memory/auth-memory';
import { BorradorMemory } from '@/infrastructure/memory/borrador-memory';
import { ChatMemory } from '@/infrastructure/memory/chat-memory';
import { DossierMemory } from '@/infrastructure/memory/dossier-memory';
import { EventoMemory } from '@/infrastructure/memory/evento-memory';
import { GestionCentroMemory } from '@/infrastructure/memory/gestion-centro-memory';
import { IncidenciaMemory } from '@/infrastructure/memory/incidencia-memory';
import { InformesMemory } from '@/infrastructure/memory/informes-memory';
import { PerfilMemory } from '@/infrastructure/memory/perfil-memory';
import { RegistroDiarioMemory } from '@/infrastructure/memory/registro-diario-memory';
import { TareaMemory } from '@/infrastructure/memory/tarea-memory';
import { ValoracionMemory } from '@/infrastructure/memory/valoracion-memory';
import { AuthSupabase } from '@/infrastructure/supabase/auth-supabase';
import { ChatSupabase } from '@/infrastructure/supabase/chat-supabase';
import { crearClienteSupabase } from '@/infrastructure/supabase/client';
import { DossierSupabase } from '@/infrastructure/supabase/dossier-supabase';
import { EventoSupabase } from '@/infrastructure/supabase/evento-supabase';
import { GestionCentroSupabase } from '@/infrastructure/supabase/gestion-centro-supabase';
import { IncidenciaSupabase } from '@/infrastructure/supabase/incidencia-supabase';
import { InformesSupabase } from '@/infrastructure/supabase/informes-supabase';
import { PerfilSupabase } from '@/infrastructure/supabase/perfil-supabase';
import { RegistroDiarioSupabase } from '@/infrastructure/supabase/registro-diario-supabase';
import { TareaSupabase } from '@/infrastructure/supabase/tarea-supabase';
import { ValoracionSupabase } from '@/infrastructure/supabase/valoracion-supabase';

interface Container {
  auth: AuthPort;
  dossiers: DossierPort;
  registros: RegistroDiarioPort;
  valoraciones: ValoracionPort;
  centros: GestionCentroPort;
  tareas: TareaPort;
  eventos: EventoPort;
  incidencias: IncidenciaPort;
  perfil: PerfilPort;
  chat: ChatPort;
  informes: InformePort;
  borradores: BorradorPort;
}

/**
 * Composition root: el único sitio que decide qué adaptador usa la app.
 * Para cambiar de backend se toca este archivo (o la variable EXPO_PUBLIC_BACKEND), nunca el núcleo ni la UI.
 */
function crearContainer(): Container {
  // Los borradores viven en el dispositivo, sea cual sea el backend. Sin localStorage (renderizado
  // estático de la web) no hay dónde guardarlos más allá de la memoria.
  const borradores =
    typeof localStorage === 'undefined'
      ? new BorradorMemory()
      : new BorradorLocalStorage(localStorage);
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
        centros: new GestionCentroSupabase(cliente),
        tareas: new TareaSupabase(cliente),
        eventos: new EventoSupabase(cliente),
        incidencias: new IncidenciaSupabase(cliente),
        perfil: new PerfilSupabase(cliente),
        chat: new ChatSupabase(cliente),
        informes: new InformesSupabase(cliente),
        borradores,
      };
    }
    console.warn(
      'EXPO_PUBLIC_BACKEND=supabase pero faltan URL o clave; se usa el backend en memoria.',
    );
  }

  // Sin sesión al arrancar, para que se vea el login.
  const auth = new AuthMemory(null);
  return {
    auth,
    dossiers: new DossierMemory(),
    registros: new RegistroDiarioMemory(),
    valoraciones: new ValoracionMemory(auth),
    centros: new GestionCentroMemory(),
    tareas: new TareaMemory(auth),
    eventos: new EventoMemory(),
    incidencias: new IncidenciaMemory(),
    perfil: new PerfilMemory(),
    chat: new ChatMemory(),
    informes: new InformesMemory(),
    borradores,
  };
}

export const container = crearContainer();
