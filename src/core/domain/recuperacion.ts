/** Alumno que ha olvidado su contraseña, a la espera de que su profe le genere un enlace. */
export interface SolicitudContrasena {
  id: string;
  alumnoNombre: string;
  alumnoEmail: string;
  creadaEn: string;
}

/** Lo que trae el enlace: el código del profe o la sesión del enlace enviado por correo. */
export type CredencialRecuperacion =
  { token: string } | { accessToken: string; refreshToken: string };
