import { CuentasMemory } from './cuentas-memory';
import type { Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

import { USUARIOS_DEMO } from './datos-demo';

let sesionActual: Usuario | null = null;

/** La sesión compartida por los adaptadores en memoria (los de Supabase la sacan del cliente). */
export function sesionMemory(): Usuario | null {
  return sesionActual;
}

export class AuthMemory implements AuthPort {
  readonly nombre = 'Memoria (datos de prueba)';

  constructor(
    usuarioInicial: Usuario | null = USUARIOS_DEMO[0],
    private readonly cuentas = new CuentasMemory(),
  ) {
    sesionActual = usuarioInicial;
  }

  async comprobarConexion() {
    return true;
  }

  async iniciarSesion(email: string, contrasena: string) {
    const usuario = this.cuentas.entrar(email, contrasena);
    sesionActual = usuario;
    return usuario;
  }

  async cerrarSesion() {
    sesionActual = null;
  }

  async usuarioActual() {
    return sesionActual;
  }

  // Solo afecta a la cuenta autenticada y dura lo que dure esta demo.
  async cambiarContrasena(contrasena: string) {
    if (!sesionActual) throw new Error('No hay sesión');
    this.cuentas.cambiarContrasena(sesionActual.id, contrasena);
  }
}
