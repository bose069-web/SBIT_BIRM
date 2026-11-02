import type { SupabaseClient } from '@supabase/supabase-js';

import { EnlaceCaducadoError } from '@/core/domain/errores';
import type { CredencialRecuperacion } from '@/core/domain/recuperacion';
import type { RecuperacionPort } from '@/core/ports/recuperacion-port';

interface FilaSolicitud {
  id: string;
  creada_en: string;
  alumno: { nombre: string; email: string } | null;
}

export class RecuperacionSupabase implements RecuperacionPort {
  // El código es de un solo uso: si falla la contraseña, reintentar no debe volver a gastarlo.
  #abierta = false;

  constructor(private readonly cliente: SupabaseClient) {}

  async pedir(email: string, urlVuelta: string) {
    const { error } = await this.cliente.functions.invoke('pedir-recuperacion', {
      body: { email, urlVuelta },
    });
    if (error) throw new Error('No se ha podido enviar la solicitud. Inténtalo de nuevo.');
  }

  async listarPendientes() {
    const { data, error } = await this.cliente
      .from('solicitudes_contrasena')
      .select('id, creada_en, alumno:perfiles!solicitudes_contrasena_alumno_id_fkey(nombre, email)')
      .is('atendida_en', null)
      .order('creada_en')
      .returns<FilaSolicitud[]>();
    if (error) throw error;
    return (data ?? []).map((f) => ({
      id: f.id,
      creadaEn: f.creada_en,
      alumnoNombre: f.alumno?.nombre ?? 'Alumno',
      alumnoEmail: f.alumno?.email ?? '',
    }));
  }

  async generarToken(solicitudId: string) {
    const { data, error } = await this.cliente.functions.invoke<{ token: string }>(
      'enlace-recuperacion',
      { body: { solicitudId } },
    );
    if (error || !data) throw new Error('No se ha podido generar el enlace. Inténtalo de nuevo.');
    return data.token;
  }

  async restablecer(credencial: CredencialRecuperacion, contrasena: string) {
    if (!this.#abierta) {
      const { error } =
        'token' in credencial
          ? await this.cliente.auth.verifyOtp({ token_hash: credencial.token, type: 'recovery' })
          : await this.cliente.auth.setSession({
              access_token: credencial.accessToken,
              refresh_token: credencial.refreshToken,
            });
      if (error) throw new EnlaceCaducadoError();
      this.#abierta = true;
    }
    const { error } = await this.cliente.auth.updateUser({ password: contrasena });
    if (error?.code === 'same_password') {
      throw new Error('La contraseña nueva debe ser distinta de la anterior');
    }
    if (error?.code === 'weak_password') {
      throw new Error('Esa contraseña es demasiado débil: prueba con una más larga');
    }
    if (error) throw new Error('No se ha podido cambiar la contraseña. Inténtalo de nuevo.');
    this.#abierta = false;
    // Cierra también las demás sesiones de la cuenta.
    await this.cliente.auth.signOut();
  }
}
