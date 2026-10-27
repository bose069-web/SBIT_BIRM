import type { Dossier } from '../domain/dossier';

export interface DossierPort {
  /** Dossiers visibles para el usuario: el suyo (alumno), los de sus alumnos (empresa) o todos (profe). */
  listar(): Promise<Dossier[]>;
  obtener(id: string): Promise<Dossier | null>;
}
