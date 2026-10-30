import type { Usuario } from '@/core/domain/usuario';

/**
 * Puerto de autenticación. El núcleo solo conoce esta interfaz;
 * cada backend (memoria, Supabase, API propia…) la implementa en infrastructure/.
 */
export interface AuthPort {
  /** Nombre legible del backend, para diagnóstico. */
  readonly nombre: string;
  comprobarConexion(): Promise<boolean>;
  iniciarSesion(email: string, contrasena: string): Promise<Usuario>;
  cerrarSesion(): Promise<void>;
  usuarioActual(): Promise<Usuario | null>;
  /** Cambia la contraseña del usuario con sesión. */
  cambiarContrasena(contrasena: string): Promise<void>;
}
