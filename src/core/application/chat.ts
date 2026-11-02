import { comprobarMensaje, type LeidoHasta, type MensajeDirecto } from '../domain/chat';
import { DatosInvalidosError } from '../domain/errores';
import type { Usuario } from '../domain/usuario';
import type { ChatPort } from '../ports/chat-port';

/** Todos los mensajes del usuario y hasta dónde ha leído cada hilo. */
export async function obtenerChat(
  chat: ChatPort,
): Promise<{ mensajes: MensajeDirecto[]; leidoHasta: LeidoHasta }> {
  const [mensajes, leidoHasta] = await Promise.all([chat.listar(), chat.leidoHasta()]);
  return {
    mensajes: [...mensajes].sort((a, b) => a.enviadoEn.localeCompare(b.enviadoEn)),
    leidoHasta,
  };
}

export function enviarMensajeDirecto(
  chat: ChatPort,
  usuario: Usuario,
  destinatarioId: string,
  texto: string,
): Promise<MensajeDirecto> {
  if (destinatarioId === usuario.id) throw new DatosInvalidosError('No puedes escribirte a ti');
  return chat.enviar(destinatarioId, comprobarMensaje(texto));
}

/** Al abrir un hilo, lo escrito hasta ahora deja de contar como no leído. */
export function marcarHiloLeido(
  chat: ChatPort,
  otroId: string,
  hasta: string = new Date().toISOString(),
): Promise<void> {
  return chat.marcarLeido(otroId, hasta);
}

/** La UI escucha el puerto sin conocer el transporte. */
export function observarChat(chat: ChatPort, alCambiar: () => void): () => void {
  return chat.suscribir(alCambiar);
}
