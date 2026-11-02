import type { DiaParaInforme, DossierParaInforme } from '../domain/informe';

export interface InformePort {
  /**
   * Dossiers y días visibles para el usuario, sin agregar: la RLS ya filtra por rol (alumno el
   * suyo, profe los de sus alumnos, empresa los que tutela, instituto los de su centro y
   * generalitat todos).
   */
  obtenerDatos(): Promise<{ dossiers: DossierParaInforme[]; dias: DiaParaInforme[] }>;
}
