import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  enviarMensajeDirecto,
  marcarHiloLeido,
  obtenerChat,
  observarChat,
} from '@/core/application/chat';
import { otroDe } from '@/core/domain/chat';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';
import type { MensajeChat } from '@/ui/utils/chat';

// Chat directo de quien ha iniciado sesión, compartido entre la pestaña Chat y la bandeja de
// Inicio: las dos leen el mismo estado y se repintan juntas al enviar o al abrir un hilo.
// Cada hilo se identifica con el id de la otra persona.

interface EstadoChat {
  mensajes: MensajeChat[];
  /** Hasta cuándo se ha abierto cada hilo (id de la otra persona → fecha y hora ISO). */
  leidoHasta: Record<string, string>;
  cargando: boolean;
  error: string | null;
}

const INICIAL: EstadoChat = { mensajes: [], leidoHasta: {}, cargando: true, error: null };

let estado = INICIAL;
let deUsuario: string | null = null;
let revision = 0;
let consumidores = 0;
let desconectar: (() => void) | null = null;
const oyentes = new Set<() => void>();

function cambiar(parcial: Partial<EstadoChat>) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((oyente) => oyente());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const leer = () => estado;

async function cargar(usuario: Usuario) {
  if (deUsuario !== usuario.id) return;
  const solicitud = ++revision;
  try {
    const { mensajes, leidoHasta } = await obtenerChat(container.chat);
    if (solicitud !== revision || deUsuario !== usuario.id) return;
    cambiar({
      mensajes: mensajes.map((m) => ({ ...m, conversacionId: otroDe(m, usuario.id) })),
      leidoHasta,
      cargando: false,
      error: null,
    });
  } catch (e) {
    if (solicitud !== revision || deUsuario !== usuario.id) return;
    cambiar({
      cargando: false,
      error: e instanceof Error ? e.message : 'No se pudo cargar el chat',
    });
  }
}

/** Mensajes, lecturas y acciones del chat de quien ha iniciado sesión. */
export function useChat(usuario: Usuario) {
  const actual = useSyncExternalStore(suscribir, leer, () => INICIAL);

  useEffect(() => {
    if (deUsuario !== usuario.id) {
      desconectar?.();
      deUsuario = usuario.id;
      consumidores = 0;
      cambiar(INICIAL);
      desconectar = observarChat(container.chat, () => {
        void cargar(usuario);
      });
    }
    consumidores += 1;
    void cargar(usuario);
    return () => {
      if (deUsuario !== usuario.id) return;
      consumidores -= 1;
      if (consumidores === 0) {
        desconectar?.();
        desconectar = null;
        deUsuario = null;
        revision += 1;
        cambiar(INICIAL);
      }
    };
  }, [usuario]);

  const recargar = useCallback(() => cargar(usuario), [usuario]);

  /** Envía al hilo; si falla, devuelve el motivo para enseñarlo junto al compositor. */
  const enviar = useCallback(
    async (otroId: string, texto: string): Promise<string | null> => {
      try {
        const m = await enviarMensajeDirecto(container.chat, usuario, otroId, texto);
        if (deUsuario !== usuario.id) return null;
        revision += 1;
        cambiar({
          mensajes: [
            ...estado.mensajes.filter((previo) => previo.id !== m.id),
            { ...m, conversacionId: otroId },
          ],
        });
        void cargar(usuario);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo enviar';
      }
    },
    [usuario],
  );

  /** Al abrir un hilo, lo que ya está escrito deja de contar como no leído. */
  const marcarLeido = useCallback(
    (otroId: string) => {
      const ahora = new Date().toISOString();
      if ((estado.leidoHasta[otroId] ?? '') >= ahora) return;
      cambiar({ leidoHasta: { ...estado.leidoHasta, [otroId]: ahora } });
      void marcarHiloLeido(container.chat, otroId, ahora).catch(() => {
        if (deUsuario === usuario.id) cambiar({ error: 'No se pudo guardar la lectura del hilo.' });
      });
    },
    [usuario.id],
  );

  return { ...(deUsuario === usuario.id ? actual : INICIAL), recargar, enviar, marcarLeido };
}
