import type {
  BorradorValoracionFinal,
  BorradorValoracionMensual,
  ValoracionFinal,
  ValoracionMensual,
} from '../domain/valoracion';

export interface ValoracionPort {
  /** Valoraciones mensuales de un dossier, ordenadas por mes. */
  listarMensuales(dossierId: string): Promise<ValoracionMensual[]>;
  /** Crea o reemplaza la valoración de ese mes; quién la pone es el usuario con sesión. */
  guardarMensual(borrador: BorradorValoracionMensual): Promise<ValoracionMensual>;
  /** Crea la valoración de ese mes sin pisar nunca otra: si ya existe, `ValoracionYaExisteError`. */
  crearMensual(borrador: BorradorValoracionMensual): Promise<ValoracionMensual>;
  /** El profe tutor confirma el mes que ya valoró la empresa; desde entonces la empresa no lo cambia. */
  confirmarMes(dossierId: string, mes: string): Promise<ValoracionMensual>;
  /** El profe tutor retira su confirmación para que la empresa corrija el mes. */
  quitarConfirmacion(dossierId: string, mes: string): Promise<ValoracionMensual>;
  obtenerFinal(dossierId: string): Promise<ValoracionFinal | null>;
  /** Crea o reemplaza la valoración final; quién la pone es el usuario con sesión. */
  guardarFinal(borrador: BorradorValoracionFinal): Promise<ValoracionFinal>;
}
