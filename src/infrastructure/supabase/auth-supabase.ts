import type { SupabaseClient, User } from '@supabase/supabase-js';

import { CredencialesInvalidasError } from '@/core/domain/errores';
import { esRol, type Usuario } from '@/core/domain/usuario';
import type { AuthPort } from '@/core/ports/auth-port';

export class AuthSupabase implements AuthPort {
  readonly nombre = 'Supabase';

  constructor(private readonly cliente: SupabaseClient) {}

  // Nombre y rol salen de la tabla perfiles (el usuario no puede cambiar su propio rol).
  private async aUsuario(user: User): Promise<Usuario> {
    const { data, error } = await this.cliente
      .from('perfiles')
      .select('nombre, rol, centro_id')
      .eq('id', user.id)
      .maybeSingle<{ nombre: string; rol: unknown; centro_id: string | null }>();
    if (error) throw new Error('No se pudo cargar tu perfil. Inténtalo de nuevo.');
    if (!data || !esRol(data.rol)) throw new Error('Tu cuenta todavía no tiene un perfil válido.');
    return {
      id: user.id,
      email: user.email ?? '',
      nombre: data.nombre,
      rol: data.rol,
      centroId: data.centro_id,
    };
  }

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
    return this.aUsuario(data.user);
  }

  async cerrarSesion() {
    const { error } = await this.cliente.auth.signOut();
    if (error) throw error;
  }

  async usuarioActual() {
    const { data, error } = await this.cliente.auth.getSession();
    if (error) throw error;
    return data.session ? this.aUsuario(data.session.user) : null;
  }
}
