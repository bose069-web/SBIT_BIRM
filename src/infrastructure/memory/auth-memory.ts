import { CredencialesInvalidasError } from '@/core/domain/errores';
import type { Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

// Usuarios de prueba para desarrollar sin backend. Contraseña de todos: kampus
const USUARIOS_DEMO: Usuario[] = [
  { id: '1', nombre: 'Alumno Demo', email: 'alumno@kampus.test', rol: 'alumno' },
  { id: '2', nombre: 'Profesora Demo', email: 'profesor@kampus.test', rol: 'profesor' },
  { id: '3', nombre: 'Familia Demo', email: 'familia@kampus.test', rol: 'familia' },
  { id: '4', nombre: 'Secretaría Demo', email: 'admin@kampus.test', rol: 'administracion' },
];
const CONTRASENA_DEMO = 'kampus';

export class AuthMemory implements AuthPort {
  readonly nombre = 'Memoria (datos de prueba)';
  private actual: Usuario | null;

  constructor(usuarioInicial: Usuario | null = USUARIOS_DEMO[0]) {
    this.actual = usuarioInicial;
  }

  async comprobarConexion() {
    return true;
  }

  async iniciarSesion(email: string, contrasena: string) {
    const usuario = USUARIOS_DEMO.find((u) => u.email === email);
    if (!usuario || contrasena !== CONTRASENA_DEMO) throw new CredencialesInvalidasError();
    this.actual = usuario;
    return usuario;
  }

  async cerrarSesion() {
    this.actual = null;
  }

  async usuarioActual() {
    return this.actual;
  }
}
