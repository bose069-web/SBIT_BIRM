import type { Rol } from './usuario';

// Qué ha pasado en un dossier. Lo escribe el sistema (triggers de la base de datos), nunca el usuario.

export const ENTIDADES_HISTORIAL = [
  'dossier',
  'registro',
  'valoracion_mensual',
  'valoracion_final',
] as const;
export type EntidadHistorial = (typeof ENTIDADES_HISTORIAL)[number];

export const ACCIONES_HISTORIAL = ['crear', 'editar', 'borrar'] as const;
export type AccionHistorial = (typeof ACCIONES_HISTORIAL)[number];

/** Solo lo necesario para entender el cambio: nunca observaciones ni comentarios. */
export interface DetalleHistorial {
  /** `AAAA-MM-DD` del día apuntado. */
  fecha?: string;
  /** `AAAA-MM` valorado. */
  mes?: string;
  valoracion?: string;
  resultado?: string;
}

export interface EntradaHistorial {
  id: string;
  dossierId: string;
  entidad: EntidadHistorial;
  accion: AccionHistorial;
  /** Null si lo ha hecho el sistema, sin sesión de usuario. */
  actorId: string | null;
  actorRol: Rol | null;
  detalle: DetalleHistorial;
  /** Fecha y hora ISO. */
  ocurridoEn: string;
}
