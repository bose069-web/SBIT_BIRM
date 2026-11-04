import { DatosInvalidosError } from './errores';
import type { Usuario } from './usuario';

// Cualquiera avisa de un problema. A quién le llega lo decide SOBRE QUÉ va: las prácticas y el
// convenio son cosa del profe tutor, lo de la empresa lo ve también la empresa y lo de la app va
// directo a la generalitat. Quien la atiende la escala cuando le supera: del destinatario al
// instituto, y del instituto a la generalitat, que es el último nivel y lo ve todo.

export const CATEGORIAS_INCIDENCIA = ['practicas', 'empresa', 'convenio', 'app', 'otra'] as const;
export type CategoriaIncidencia = (typeof CATEGORIAS_INCIDENCIA)[number];

/** A quién le llega una incidencia. */
export const DESTINOS_INCIDENCIA = ['profe', 'empresa', 'instituto', 'generalitat'] as const;
export type DestinoIncidencia = (typeof DESTINOS_INCIDENCIA)[number];

/** Por dónde va: al abrirla la lleva su destinatario; escalarla la sube de nivel. */
export const NIVELES_INCIDENCIA = ['destinatario', 'instituto', 'generalitat'] as const;
export type NivelIncidencia = (typeof NIVELES_INCIDENCIA)[number];

/** Sobre qué va → a quién le llega. Lo decide la categoría, no quien la abre. */
export const DESTINO_POR_CATEGORIA: Record<CategoriaIncidencia, DestinoIncidencia> = {
  practicas: 'profe',
  empresa: 'empresa',
  convenio: 'profe',
  app: 'generalitat',
  otra: 'profe',
};

export const PRIORIDADES_INCIDENCIA = ['baja', 'media', 'alta'] as const;
export type PrioridadIncidencia = (typeof PRIORIDADES_INCIDENCIA)[number];

export const ESTADOS_INCIDENCIA = ['abierta', 'en_curso', 'resuelta'] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export interface Incidencia {
  id: string;
  /** Centro que la atiende; null = la atiende directamente la generalitat. */
  centroId: string | null;
  dossierId: string | null;
  /** Profe tutor del dossier (si es sobre un dossier): atiende las que le tocan por categoría. */
  tutorId: string | null;
  /** Tutor de la empresa del dossier: ve y responde las que van sobre la empresa, pero no cierra. */
  empresaTutorId: string | null;
  creadaPor: string;
  creadaPorNombre: string | null;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  /** Hasta dónde ha subido: la lleva su destinatario, el instituto o la generalitat. */
  nivel: NivelIncidencia;
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
  nivel?: NivelIncidencia;
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

/** Lo que hace falta para saber a quién le toca: sobre qué va y por dónde anda. */
export type RutaIncidencia = Pick<
  Incidencia,
  'categoria' | 'centroId' | 'tutorId' | 'empresaTutorId' | 'nivel'
>;

/** Sobre qué va → a quién le llega. Sirve para avisar al alumno antes de que la abra. */
export function destinoDe(categoria: CategoriaIncidencia): DestinoIncidencia {
  return DESTINO_POR_CATEGORIA[categoria];
}

/**
 * Quién la gestiona ahora: cambia el estado, responde y la cierra. Al abrirla la lleva el
 * destinatario de su categoría; si ese no existe (sin dossier no hay profe tutor) cae en el
 * instituto, y sin centro en la generalitat. Lo de la empresa lo gestiona el profe tutor: la
 * empresa lo ve y responde, pero no lo cierra.
 */
export function quienAtiende(i: RutaIncidencia): DestinoIncidencia {
  if (i.nivel === 'generalitat') return 'generalitat';
  if (i.nivel === 'instituto') return i.centroId ? 'instituto' : 'generalitat';
  if (DESTINO_POR_CATEGORIA[i.categoria] === 'generalitat') return 'generalitat';
  if (i.tutorId) return 'profe';
  return i.centroId ? 'instituto' : 'generalitat';
}

/** El nivel al que sube si la escalan, o null si ya está en el último. */
export function siguienteNivel(i: RutaIncidencia): NivelIncidencia | null {
  if (i.nivel === 'generalitat') return null;
  if (i.nivel === 'instituto') return 'generalitat';
  return i.centroId ? 'instituto' : 'generalitat';
}

/** La atiende quien le toca por categoría y nivel; la generalitat, además, todas. */
export function atiendeIncidencia(usuario: Usuario, i: RutaIncidencia): boolean {
  if (usuario.rol === 'generalitat') return true;
  switch (quienAtiende(i)) {
    case 'profe':
      return usuario.rol === 'profe' && i.tutorId === usuario.id;
    case 'instituto':
      return usuario.rol === 'instituto' && i.centroId !== null && usuario.centroId === i.centroId;
    default:
      return false;
  }
}

/** La empresa del dossier ve y responde lo que va sobre ella, pero no la cierra ni la escala. */
export function respondeEmpresa(
  usuario: Usuario,
  i: Pick<Incidencia, 'categoria' | 'empresaTutorId'>,
): boolean {
  return usuario.rol === 'empresa' && i.categoria === 'empresa' && i.empresaTutorId === usuario.id;
}

/**
 * La sigue sin gestionarla: el profe tutor ve todo lo de sus alumnos, la empresa lo que va sobre
 * ella y el instituto todo lo de su centro. Así, al escalarla, quien la llevaba la sigue viendo.
 */
export function sigueIncidencia(usuario: Usuario, i: RutaIncidencia): boolean {
  return (
    (usuario.rol === 'profe' && i.tutorId === usuario.id) ||
    respondeEmpresa(usuario, i) ||
    (usuario.rol === 'instituto' && i.centroId !== null && usuario.centroId === i.centroId)
  );
}

/** La ven y escriben mensajes quien la abrió, quien la gestiona y quien la sigue. */
export function participaEnIncidencia(
  usuario: Usuario,
  i: RutaIncidencia & Pick<Incidencia, 'creadaPor'>,
): boolean {
  return i.creadaPor === usuario.id || atiendeIncidencia(usuario, i) || sigueIncidencia(usuario, i);
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
