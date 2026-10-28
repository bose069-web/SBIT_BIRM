import type { BorradorDossier, Dossier } from '../domain/dossier';

export interface DossierPort {
  /**
   * Dossiers visibles para el usuario: el suyo (alumno), los de sus alumnos (profe y empresa),
   * los de su centro (instituto) o todos (generalitat).
   */
  listar(): Promise<Dossier[]>;
  obtener(id: string): Promise<Dossier | null>;
  /**
   * Crea o actualiza el dossier y deja sus actividades como en el borrador, todo a la vez.
   * El profe tutor lo pone el sistema: es el profe asignado al alumno.
   */
  guardar(borrador: BorradorDossier): Promise<Dossier>;
  borrar(id: string): Promise<void>;
}
