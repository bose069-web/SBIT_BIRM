import { DatosInvalidosError } from './errores';
import type { Usuario } from './usuario';

// Cualquiera avisa de un problema. Lo atiende el instituto de su centro y, si le supera, lo
// escala a la generalitat, que ve y gestiona todas. El profe tutor del dossier la sigue y,
// como todos los que participan, escribe mensajes: hace de comunicador.

export const CATEGORIAS_INCIDENCIA = ['practicas', 'empresa', 'convenio', 'app', 'otra'] as const;
export type CategoriaIncidencia = (typeof CATEGORIAS_INCIDENCIA)[number];

export const PRIORIDADES_INCIDENCIA = ['baja', 'media', 'alta'] as const;
export type PrioridadIncidencia = (typeof PRIORIDADES_INCIDENCIA)[number];

export const ESTADOS_INCIDENCIA = ['abierta', 'en_curso', 'resuelta'] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export interface Incidencia {
  id: string;
  /** Centro que la atiende; null = la atiende directamente la generalitat. */
  centroId: string | null;
  dossierId: string | null;
  /** Profe tutor del dossier (si es sobre un dossier): la sigue y escribe mensajes. */
  tutorId: string | null;
  creadaPor: string;
  creadaPorNombre: string | null;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  /** El instituto la ha pasado a la generalitat. */
  escalada: boolean;
  respuesta: string | null;
  atendidaPor: string | null;
  /** Fechas y horas ISO. */
  creadaEn: string;
  resueltaEn: string | null;
}

export interface BorradorIncidencia {
  dossierId: string | null;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
}

export interface MensajeIncidencia {
  id: string;
  incidenciaId: string;
  autorId: string;
  autorNombre: string | null;
  texto: string;
  /** Fecha y hora ISO. */
  creadoEn: string;
}

/** Lo que cambia quien la atiende. */
export interface CambiosIncidencia {
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  respuesta?: string | null;
  escalada?: boolean;
}

export function comprobarIncidencia(b: BorradorIncidencia): void {
  if (!b.titulo.trim()) throw new DatosInvalidosError('Pon un título a la incidencia');
  if (b.titulo.trim().length > 120) throw new DatosInvalidosError('El título es demasiado largo');
  if (!b.descripcion.trim()) throw new DatosInvalidosError('Explica qué ha pasado');
  if (b.descripcion.trim().length > 4000) {
    throw new DatosInvalidosError('La descripción es demasiado larga');
  }
  if (!CATEGORIAS_INCIDENCIA.includes(b.categoria)) {
    throw new DatosInvalidosError('Categoría no válida');
  }
}

/** La atienden la generalitat (todas) y el instituto de su centro. */
export function atiendeIncidencia(usuario: Usuario, i: Pick<Incidencia, 'centroId'>): boolean {
  return (
    usuario.rol === 'generalitat' ||
    (usuario.rol === 'instituto' && i.centroId !== null && usuario.centroId === i.centroId)
  );
}

/** Participan (la ven y escriben mensajes): quien la abrió, quien la atiende y el profe tutor. */
export function participaEnIncidencia(
  usuario: Usuario,
  i: Pick<Incidencia, 'centroId' | 'creadaPor' | 'tutorId'>,
): boolean {
  return (
    i.creadaPor === usuario.id ||
    atiendeIncidencia(usuario, i) ||
    (usuario.rol === 'profe' && i.tutorId === usuario.id)
  );
}

export function comprobarMensaje(texto: string): void {
  if (!texto.trim()) throw new DatosInvalidosError('Escribe el mensaje');
  if (texto.trim().length > 2000) throw new DatosInvalidosError('El mensaje es demasiado largo');
}

const PESO_PRIORIDAD: Record<PrioridadIncidencia, number> = { alta: 0, media: 1, baja: 2 };
const PESO_ESTADO: Record<EstadoIncidencia, number> = { abierta: 0, en_curso: 1, resuelta: 2 };

/** Primero las pendientes, por prioridad y antigüedad; las resueltas al final, recientes arriba. */
export function ordenarIncidencias<T extends Pick<Incidencia, 'estado' | 'prioridad' | 'creadaEn'>>(
  lista: T[],
): T[] {
  return [...lista].sort((a, b) => {
    const estado = PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado];
    if (estado) return estado;
    if (a.estado === 'resuelta') return b.creadaEn.localeCompare(a.creadaEn);
    return (
      PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
      a.creadaEn.localeCompare(b.creadaEn)
    );
  });
}
