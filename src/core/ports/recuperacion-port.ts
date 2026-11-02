import type { CredencialRecuperacion, SolicitudContrasena } from '../domain/recuperacion';

export interface RecuperacionPort {
  /** Sin sesión. No revela si el correo tiene cuenta. */
  pedir(email: string, urlVuelta: string): Promise<void>;
  /** Las del profe con sesión. */
  listarPendientes(): Promise<SolicitudContrasena[]>;
  /** Atiende la solicitud y devuelve un código de un solo uso. */
  generarToken(solicitudId: string): Promise<string>;
  /** Lanza `EnlaceCaducadoError` si el enlace ya no sirve. Deja la sesión cerrada. */
  restablecer(credencial: CredencialRecuperacion, contrasena: string): Promise<void>;
}
