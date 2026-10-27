import type { BorradorRegistro, RegistroDiario } from '../domain/registro-diario';

export interface RegistroDiarioPort {
  /** Días de un dossier entre dos fechas incluidas (`AAAA-MM-DD`), ordenados por fecha. */
  listar(dossierId: string, desde: string, hasta: string): Promise<RegistroDiario[]>;
  obtenerPorFecha(dossierId: string, fecha: string): Promise<RegistroDiario | null>;
  /** Crea o reemplaza el día (con sus horas). */
  guardar(borrador: BorradorRegistro): Promise<RegistroDiario>;
  eliminar(id: string): Promise<void>;
}
