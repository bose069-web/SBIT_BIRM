import { CredencialesInvalidasError, CorreoYaRegistradoError } from '@/core/domain/errores';
import type { Usuario } from '@/core/domain/usuario';
import { CONTRASENA_DEMO, USUARIOS_DEMO } from './datos-demo';

/** Credenciales efímeras de la demo, compartidas por altas y autenticación. */
export class CuentasMemory {
  #cuentas = new Map(
    USUARIOS_DEMO.map((usuario) => [
      usuario.email,
      { usuario: { ...usuario }, contrasena: CONTRASENA_DEMO },
    ]),
  );

  crear(usuario: Usuario, contrasena: string) {
    if (this.#cuentas.has(usuario.email)) throw new CorreoYaRegistradoError();
    this.#cuentas.set(usuario.email, { usuario: { ...usuario }, contrasena });
  }

  entrar(email: string, contrasena: string): Usuario {
    const cuenta = this.#cuentas.get(email);
    if (!cuenta || cuenta.contrasena !== contrasena) throw new CredencialesInvalidasError();
    return { ...cuenta.usuario };
  }

  cambiarContrasena(id: string, contrasena: string) {
    const cuenta = [...this.#cuentas.values()].find((c) => c.usuario.id === id);
    if (!cuenta) throw new CredencialesInvalidasError();
    cuenta.contrasena = contrasena;
  }
}
