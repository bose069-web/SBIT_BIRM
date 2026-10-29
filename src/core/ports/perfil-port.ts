import type { DatosPersonales, ResultadoCambioEmail } from '../domain/perfil';

/** Datos personales del usuario con sesión: solo los suyos. */
export interface PerfilPort {
  obtener(): Promise<DatosPersonales>;
  guardar(datos: DatosPersonales): Promise<DatosPersonales>;
  cambiarNombre(nombre: string): Promise<void>;
  /**
   * Pide el cambio del correo de acceso. `pendiente` si el proveedor manda un enlace de
   * confirmación al buzón nuevo y hasta entonces sigue valiendo el anterior.
   */
  cambiarEmail(email: string): Promise<ResultadoCambioEmail>;
}
