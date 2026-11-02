import { DatosInvalidosError } from './errores';

// Chat directo entre dos personas que comparten un dossier: la empresa con su alumno y con el
// profe tutor de ese alumno (y el alumno con su profe). Cada par de personas tiene un único hilo.

export interface MensajeDirecto {
  id: string;
  autorId: string;
  autorNombre: string;
  destinatarioId: string;
  texto: string;
  /** Fecha y hora ISO. */
  enviadoEn: string;
}

/** Hasta cuándo ha leído el usuario cada hilo, por id de la otra persona. */
export type LeidoHasta = Record<string, string>;

export const MAXIMO_MENSAJE = 2000;

export function comprobarMensaje(texto: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new DatosInvalidosError('Escribe un mensaje');
  if (limpio.length > MAXIMO_MENSAJE) {
    throw new DatosInvalidosError(`Máximo ${MAXIMO_MENSAJE} caracteres por mensaje`);
  }
  return limpio;
}

/** La otra persona del hilo, vista desde el usuario. */
export function otroDe(mensaje: MensajeDirecto, usuarioId: string): string {
  return mensaje.autorId === usuarioId ? mensaje.destinatarioId : mensaje.autorId;
}
