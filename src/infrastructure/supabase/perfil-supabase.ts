import type { SupabaseClient } from '@supabase/supabase-js';

import {
  DATOS_PERSONALES_VACIOS,
  type DatosPersonales,
  type Identidad,
  type Idioma,
  type ResultadoCambioEmail,
} from '@/core/domain/perfil';
import type { PerfilPort } from '@/core/ports/perfil-port';

interface FilaDatosPersonales {
  telefono: string | null;
  idioma: Idioma;
  notificaciones: boolean;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  departamento: string | null;
  horario_tutoria: string | null;
  cargo: string | null;
  telefono_trabajo: string | null;
  centro_trabajo: string | null;
}

const COLUMNAS =
  'telefono, idioma, notificaciones, emergencia_nombre, ' +
  'emergencia_telefono, departamento, horario_tutoria, cargo, telefono_trabajo, centro_trabajo';

function aDatos(f: FilaDatosPersonales): DatosPersonales {
  return {
    telefono: f.telefono,
    idioma: f.idioma,
    notificaciones: f.notificaciones,
    emergenciaNombre: f.emergencia_nombre,
    emergenciaTelefono: f.emergencia_telefono,
    departamento: f.departamento,
    horarioTutoria: f.horario_tutoria,
    cargo: f.cargo,
    telefonoTrabajo: f.telefono_trabajo,
    centroTrabajo: f.centro_trabajo,
  };
}

function aFila(d: DatosPersonales): FilaDatosPersonales {
  return {
    telefono: d.telefono,
    idioma: d.idioma,
    notificaciones: d.notificaciones,
    emergencia_nombre: d.emergenciaNombre,
    emergencia_telefono: d.emergenciaTelefono,
    departamento: d.departamento,
    horario_tutoria: d.horarioTutoria,
    cargo: d.cargo,
    telefono_trabajo: d.telefonoTrabajo,
    centro_trabajo: d.centroTrabajo,
  };
}

// RLS: cada uno lee y escribe solo su fila; el nombre se cambia con cambiar_mi_nombre.
export class PerfilSupabase implements PerfilPort {
  constructor(private readonly cliente: SupabaseClient) {}

  private async idActual(): Promise<string> {
    const { data } = await this.cliente.auth.getUser();
    if (!data.user) throw new Error('No hay sesión');
    return data.user.id;
  }

  async obtener() {
    const { data, error } = await this.cliente
      .from('datos_personales')
      .select(COLUMNAS)
      .eq('id', await this.idActual())
      .maybeSingle<FilaDatosPersonales>();
    if (error) throw new Error(error.message);
    return data ? aDatos(data) : { ...DATOS_PERSONALES_VACIOS };
  }

  async guardar(datos: DatosPersonales) {
    const { data, error } = await this.cliente
      .from('datos_personales')
      .upsert({ id: await this.idActual(), ...aFila(datos) })
      .select(COLUMNAS)
      .single<FilaDatosPersonales>();
    if (error) throw new Error(error.message);
    return aDatos(data);
  }

  async cambiarNombre(nombre: string) {
    const { error } = await this.cliente.rpc('cambiar_mi_nombre', { nuevo: nombre });
    if (error) throw new Error(error.message);
  }

  // Con la confirmación por correo activada, Supabase manda un enlace al buzón nuevo y el
  // correo de la sesión sigue siendo el anterior hasta que se confirme.
  async cambiarEmail(email: string): Promise<ResultadoCambioEmail> {
    const { data, error } = await this.cliente.auth.updateUser({ email });
    if (error) throw new Error(error.message);
    return data.user?.email?.toLowerCase() === email ? 'cambiado' : 'pendiente';
  }

  // RLS: el alumno solo lee la suya; la escriben quienes gestionan su dossier.
  async obtenerIdentidad(): Promise<Identidad> {
    const { data, error } = await this.cliente
      .from('identidad_alumno')
      .select('dni')
      .eq('alumno_id', await this.idActual())
      .maybeSingle<{ dni: string | null }>();
    if (error) throw new Error(error.message);
    return { dni: data?.dni ?? null };
  }
}
