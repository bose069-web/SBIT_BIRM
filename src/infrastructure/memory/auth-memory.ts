import { CredencialesInvalidasError } from '@/core/domain/errores';
import type { Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

import { CONTRASENA_DEMO, USUARIOS_DEMO } from './datos-demo';

let sesionActual: Usuario | null = null;

/** La sesión compartida por los adaptadores en memoria (los de Supabase la sacan del cliente). */
export function sesionMemory(): Usuario | null {
  return sesionActual;
}

export class AuthMemory implements AuthPort {
  readonly nombre = 'Memoria (datos de prueba)';

  constructor(usuarioInicial: Usuario | null = USUARIOS_DEMO[0]) {
    sesionActual = usuarioInicial;
  }

  async comprobarConexion() {
    return true;
  }

  async iniciarSesion(email: string, contrasena: string) {
    const usuario = USUARIOS_DEMO.find((u) => u.email === email);
    if (!usuario || contrasena !== CONTRASENA_DEMO) throw new CredencialesInvalidasError();
    sesionActual = usuario;
    return usuario;
  }

  async cerrarSesion() {
    sesionActual = null;
  }

  async usuarioActual() {
    return sesionActual;
  }
}
