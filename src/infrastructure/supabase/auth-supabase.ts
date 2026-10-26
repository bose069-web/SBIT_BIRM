import type { SupabaseClient, User } from '@supabase/supabase-js';

import { CredencialesInvalidasError } from '@/core/domain/errores';
import { esRol, type Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

// Provisional: nombre y rol salen de user_metadata hasta que exista la tabla de perfiles.
function aUsuario(user: User): Usuario {
  const rol: unknown = user.user_metadata?.rol;
  return {
    id: user.id,
    email: user.email ?? '',
    nombre: (user.user_metadata?.nombre as string | undefined) ?? user.email ?? '',
    // Un rol desconocido nunca da más permisos: se trata como alumno.
    rol: esRol(rol) ? rol : 'alumno',
  };
}

export class AuthSupabase implements AuthPort {
  readonly nombre = 'Supabase';

  constructor(private readonly cliente: SupabaseClient) {}

  async comprobarConexion() {
    const { error } = await this.cliente.auth.getSession();
    return !error;
  }

  async iniciarSesion(email: string, contrasena: string) {
    const { data, error } = await this.cliente.auth.signInWithPassword({
      email,
      password: contrasena,
    });
    if (error || !data.user) throw new CredencialesInvalidasError();
    return aUsuario(data.user);
  }

  async cerrarSesion() {
    await this.cliente.auth.signOut();
  }

  async usuarioActual() {
    const { data } = await this.cliente.auth.getSession();
    return data.session ? aUsuario(data.session.user) : null;
  }
}
