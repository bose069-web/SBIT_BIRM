import { useSyncExternalStore } from 'react';

import type { MensajeChat } from '@/ui/utils/chat';

// Chat de la empresa con sus alumnos y sus profes. Todavía no hay backend: los mensajes viven en
// memoria mientras dure la sesión, con conversaciones de ejemplo para los datos de prueba.
//
// Cuando PC 1 cree el módulo del chat (entidad, puerto, casos de uso, tabla y contenedor), esta
// pantalla solo cambia de dónde lee y escribe: los componentes no se tocan.

// Mismos ids que `supabase/seed.sql` y `src/infrastructure/memory/datos-demo.ts`, para que las
// conversaciones de ejemplo sean las de la empresa de prueba.
const ALUMNO_DEMO = '11111111-1111-1111-1111-111111111111';
const PROFE_DEMO = '22222222-2222-2222-2222-222222222222';
const EMPRESA_DEMO = '33333333-3333-3333-3333-333333333333';

const HILO_ALUMNO = `alumno:${ALUMNO_DEMO}`;
const HILO_PROFE = `profe:${PROFE_DEMO}`;

/** Fecha y hora ISO de hace unos minutos: así la bandeja parece reciente sin fijar el día. */
function haceMinutos(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString();
}

interface EstadoChat {
  mensajes: MensajeChat[];
  /** Hasta cuándo se ha abierto cada hilo (`conversacionId` → fecha y hora ISO). */
  leidoHasta: Record<string, string>;
}

let estado: EstadoChat = {
  mensajes: [
    {
      id: 'chat-demo-1',
      conversacionId: HILO_PROFE,
      autorId: PROFE_DEMO,
      autorNombre: 'Profe Demo',
      texto: 'Buenas tardes, ¿cómo va Alumno Demo este mes?',
      enviadoEn: haceMinutos(190),
    },
    {
      id: 'chat-demo-2',
      conversacionId: HILO_PROFE,
      autorId: EMPRESA_DEMO,
      autorNombre: 'Tutor Empresa Demo',
      texto:
        'Muy bien: ha cerrado el informe de octubre sin ayuda y se ha integrado con el equipo.',
      enviadoEn: haceMinutos(170),
    },
    {
      id: 'chat-demo-3',
      conversacionId: HILO_PROFE,
      autorId: PROFE_DEMO,
      autorNombre: 'Profe Demo',
      texto: 'Perfecto. Si te parece, lo comentamos en la reunión del jueves.',
      enviadoEn: haceMinutos(45),
    },
    {
      id: 'chat-demo-4',
      conversacionId: HILO_ALUMNO,
      autorId: ALUMNO_DEMO,
      autorNombre: 'Alumno Demo',
      texto: 'Hola, ya he subido el informe de octubre. ¿Lo puedes revisar?',
      enviadoEn: haceMinutos(100),
    },
    {
      id: 'chat-demo-5',
      conversacionId: HILO_ALUMNO,
      autorId: EMPRESA_DEMO,
      autorNombre: 'Tutor Empresa Demo',
      texto: 'Lo miro esta tarde y te digo algo.',
      enviadoEn: haceMinutos(90),
    },
    {
      id: 'chat-demo-6',
      conversacionId: HILO_ALUMNO,
      autorId: ALUMNO_DEMO,
      autorNombre: 'Alumno Demo',
      texto: 'Gracias.',
      enviadoEn: haceMinutos(85),
    },
  ],
  // El hilo del alumno está leído; del profe queda un mensaje sin leer en la bandeja.
  leidoHasta: {
    [HILO_ALUMNO]: new Date().toISOString(),
    [HILO_PROFE]: haceMinutos(120),
  },
};

// Lo que se pinta en el servidor (web): sin mensajes, para no depender de la hora en que se cargue.
const VACIO: EstadoChat = { mensajes: [], leidoHasta: {} };

const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leer(): EstadoChat {
  return estado;
}

let contador = 0;

/** Escribe en el hilo con el nombre de quien ha iniciado sesión. */
export function enviarMensajeChat(
  conversacionId: string,
  autorId: string,
  autorNombre: string,
  texto: string,
): void {
  const limpio = texto.trim();
  if (!limpio) return;
  contador += 1;
  const mensaje: MensajeChat = {
    id: `chat-local-${Date.now()}-${contador}`,
    conversacionId,
    autorId,
    autorNombre,
    texto: limpio,
    enviadoEn: new Date().toISOString(),
  };
  estado = { ...estado, mensajes: [...estado.mensajes, mensaje] };
  avisar();
}

/** Al abrir un hilo, lo que ya está escrito deja de contar como no leído. */
export function marcarChatLeido(
  conversacionId: string,
  ahora: string = new Date().toISOString(),
): void {
  const previo = estado.leidoHasta[conversacionId];
  if (previo && previo >= ahora) return;
  estado = { ...estado, leidoHasta: { ...estado.leidoHasta, [conversacionId]: ahora } };
  avisar();
}

/** Mensajes y hasta cuándo se ha leído cada hilo; se repinta al enviar y al abrir. */
export function useChatEmpresa(): EstadoChat {
  return useSyncExternalStore(suscribir, leer, () => VACIO);
}
