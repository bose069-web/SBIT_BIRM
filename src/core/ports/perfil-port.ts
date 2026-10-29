import type { DatosPersonales } from '../domain/perfil';

/** Datos personales del usuario con sesión: solo los suyos. */
export interface PerfilPort {
  obtener(): Promise<DatosPersonales>;
  guardar(datos: DatosPersonales): Promise<DatosPersonales>;
  cambiarNombre(nombre: string): Promise<void>;
}
