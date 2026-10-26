import type { Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

// Casos de uso de autenticación. Reciben el puerto por parámetro: no saben qué backend hay detrás.

export function iniciarSesion(auth: AuthPort, email: string, contrasena: string): Promise<Usuario> {
  return auth.iniciarSesion(email.trim().toLowerCase(), contrasena);
}

export function cerrarSesion(auth: AuthPort): Promise<void> {
  return auth.cerrarSesion();
}

export function obtenerUsuarioActual(auth: AuthPort): Promise<Usuario | null> {
  return auth.usuarioActual();
}

export function comprobarConexion(auth: AuthPort): Promise<boolean> {
  return auth.comprobarConexion().catch(() => false);
}
