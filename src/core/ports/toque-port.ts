import type { Toque } from '../domain/toque';

export interface ToquePort {
  /**
   * Da un toque al alumno de ese dossier. Quién lo da y qué día es lo pone el sistema. La base solo
   * admite uno al día por dossier: el segundo lanza `ToqueYaExisteError`.
   */
  dar(dossierId: string, diasSinApuntar: number): Promise<Toque>;
  /** Los toques del alumno con sesión que todavía no ha resuelto, del más reciente al más antiguo. */
  pendientesDelAlumno(): Promise<Toque[]>;
  /** El último toque de cada dossier de la lista; los dossiers sin toques no aparecen. */
  ultimosPorDossier(dossierIds: string[]): Promise<Toque[]>;
  /** El alumno marca que lo ha visto; solo cambia `vistoEn` y solo la primera vez. */
  marcarVisto(id: string): Promise<Toque>;
}
