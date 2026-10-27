import { DatosInvalidosError } from './errores';

// Fechas del calendario: las generales (sin dossier) las ve todo el mundo; las de un dossier, sus participantes.

export const TIPOS_EVENTO = ['evento', 'entrega', 'reunion', 'festivo'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface Evento {
  id: string;
  /** `null` = evento general (festivo, fecha de la generalitat o del centro). */
  dossierId: string | null;
  titulo: string;
  /** `AAAA-MM-DD` */
  fecha: string;
  tipo: TipoEvento;
}

export type BorradorEvento = Omit<Evento, 'id'>;

export function comprobarEvento(borrador: BorradorEvento): void {
  if (!borrador.titulo.trim()) throw new DatosInvalidosError('El evento necesita un título');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(borrador.fecha)) throw new DatosInvalidosError('Fecha no válida');
  if (!TIPOS_EVENTO.includes(borrador.tipo)) throw new DatosInvalidosError('Tipo no válido');
}
