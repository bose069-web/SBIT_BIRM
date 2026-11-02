import type { AlumnoEnClase, BorradorGrupo, Grupo } from '../domain/grupo';

export interface GrupoPort {
  /** Clases de un centro. */
  listarPorCentro(centroId: string): Promise<Grupo[]>;
  /** Crea la clase. Si el centro ya tiene una igual, `DatosInvalidosError`. */
  crear(borrador: BorradorGrupo): Promise<Grupo>;
  actualizar(borrador: BorradorGrupo): Promise<Grupo>;
  /** Al borrarla, sus alumnos se quedan sin clase. */
  borrar(id: string): Promise<void>;
  /** Alumnos del centro con su clase (o sin ella), para repartirlos. */
  listarAlumnos(centroId: string): Promise<AlumnoEnClase[]>;
  /** Mete a esos alumnos en la clase de una sola vez. */
  asignarEnBloque(grupoId: string, alumnoIds: string[]): Promise<void>;
  /** Los deja sin clase. */
  quitarDeClase(alumnoIds: string[]): Promise<void>;
}
