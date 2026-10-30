import type { SupabaseClient } from '@supabase/supabase-js';

import type { Centro, Convenio, Persona } from '@/core/domain/centro';
import {
  AltaSinIncorporarError,
  CorreoYaRegistradoError,
  DatosInvalidosError,
} from '@/core/domain/errores';
import { esRol } from '@/core/domain/usuario';
import type { GestionCentroPort } from '@/core/ports/gestion-centro-port';

import { crearClienteTemporal } from './client';

interface FilaPersona {
  id: string;
  nombre: string;
  email: string;
  rol: unknown;
  centro_id: string | null;
  profe_id: string | null;
}

interface FilaConvenio {
  centro_id: string;
  empresa_id: string;
  firmado_en: string | null;
  empresas: { nombre: string } | null;
}

/** Lo que responde Supabase Auth al crear una cuenta, en palabras del instituto. */
function errorDeAlta(error: { message: string; code?: string }): Error {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return new CorreoYaRegistradoError();
    case 'email_address_invalid':
      return new DatosInvalidosError('Escribe un correo válido');
    case 'signup_disabled':
    case 'email_provider_disabled':
      return new Error('El servidor no permite crear cuentas nuevas ahora mismo');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new Error('Se han creado demasiadas cuentas seguidas. Inténtalo dentro de un rato');
    default:
      return new Error(error.message);
  }
}

function comprobar(error: { message: string; code?: string } | null) {
  if (!error) return;
  // 23503: clave foránea. Pasa al quitar un convenio que aún usan dossiers.
  if (error.code === '23503') {
    throw new Error('No se puede: todavía hay dossiers que dependen de esto');
  }
  throw new Error(error.message);
}

// RLS y el trigger proteger_perfil deciden qué puede ver y cambiar cada uno.
export class GestionCentroSupabase implements GestionCentroPort {
  constructor(
    private readonly cliente: SupabaseClient,
    private readonly proyecto: { url: string; clave: string },
  ) {}

  async listarCentros(): Promise<Centro[]> {
    const { data, error } = await this.cliente
      .from('centros')
      .select('id, nombre, codigo')
      .order('nombre')
      .returns<Centro[]>();
    comprobar(error);
    return data ?? [];
  }

  async crearCentro(datos: { nombre: string; codigo: string }): Promise<Centro> {
    const { data, error } = await this.cliente
      .from('centros')
      .insert({ nombre: datos.nombre, codigo: datos.codigo })
      .select('id, nombre, codigo')
      .single<Centro>();
    comprobar(error);
    if (!data) throw new Error('No se ha podido crear el centro');
    return data;
  }

  async obtenerCentro(centroId: string) {
    const { data, error } = await this.cliente
      .from('centros')
      .select('id, nombre, codigo')
      .eq('id', centroId)
      .maybeSingle<Centro>();
    comprobar(error);
    return data;
  }

  async listarPersonas(centroId: string) {
    const { data, error } = await this.cliente
      .from('perfiles')
      .select('id, nombre, email, rol, centro_id, profe_id')
      .or(`centro_id.eq.${centroId},and(centro_id.is.null,empresa_id.is.null,rol.eq.alumno)`)
      .returns<FilaPersona[]>();
    comprobar(error);
    return (data ?? []).map((f): Persona => ({
      id: f.id,
      nombre: f.nombre,
      email: f.email,
      rol: esRol(f.rol) ? f.rol : 'alumno',
      centroId: f.centro_id,
      profeId: f.profe_id,
    }));
  }

  async listarTutoresEmpresa(empresaId: string) {
    const { data, error } = await this.cliente
      .from('perfiles')
      .select('id, nombre, email, rol, centro_id, profe_id')
      .eq('rol', 'empresa')
      .eq('empresa_id', empresaId)
      .order('nombre')
      .returns<FilaPersona[]>();
    comprobar(error);
    return (data ?? []).map((f): Persona => ({
      id: f.id,
      nombre: f.nombre,
      email: f.email,
      rol: 'empresa',
      centroId: f.centro_id,
      profeId: null,
    }));
  }

  async incorporarAlumno(personaId: string, centroId: string) {
    const { error } = await this.cliente
      .from('perfiles')
      .update({ centro_id: centroId })
      .eq('id', personaId);
    comprobar(error);
  }

  // El alta usa un cliente temporal: signUp abre sesión con la cuenta nueva y la del instituto no
  // debe cambiar. El perfil lo crea el trigger al_crear_usuario y el nombre sale de los metadatos.
  async crearAlumno(
    datos: { nombre: string; email: string; contrasena: string },
    centroId: string,
  ) {
    // Con confirmación de correo, signUp sobre una cuenta sin confirmar devuelve esa cuenta como si
    // fuera nueva y conserva su contraseña: la inicial que se mostrase no serviría. Hay que frenarlo.
    const { data: existente, error: errorExistente } = await this.cliente
      .from('perfiles')
      .select('id')
      .eq('email', datos.email)
      .maybeSingle<{ id: string }>();
    comprobar(errorExistente);
    if (existente) throw new CorreoYaRegistradoError();

    const temporal = crearClienteTemporal(this.proyecto.url, this.proyecto.clave);
    const { data, error } = await temporal.auth.signUp({
      email: datos.email,
      password: datos.contrasena,
      options: { data: { nombre: datos.nombre } },
    });
    if (error) throw errorDeAlta(error);
    // Con la confirmación de correo activa, un correo repetido devuelve un usuario sin identidades.
    if (!data.user || data.user.identities?.length === 0) throw new CorreoYaRegistradoError();
    // Esa sesión no le sirve a nadie: se revoca, y si falla caduca sola sin haberse guardado.
    if (data.session) await temporal.auth.signOut({ scope: 'local' }).catch(() => undefined);

    const { data: fila, error: errorCentro } = await this.cliente
      .from('perfiles')
      .update({ centro_id: centroId })
      .eq('id', data.user.id)
      .select('id, nombre, email, rol, centro_id, profe_id')
      .maybeSingle<FilaPersona>();
    if (errorCentro) throw new AltaSinIncorporarError();
    // Una cuenta recién creada siempre se puede tocar: si RLS no la deja, es de otro centro y ya existía.
    if (!fila) throw new CorreoYaRegistradoError();
    return {
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      rol: 'alumno' as const,
      centroId: fila.centro_id,
      profeId: fila.profe_id,
    };
  }

  async asignarProfe(alumnoId: string, profeId: string | null) {
    const { error } = await this.cliente
      .from('perfiles')
      .update({ profe_id: profeId })
      .eq('id', alumnoId);
    comprobar(error);
  }

  async listarEmpresas() {
    const { data, error } = await this.cliente
      .from('empresas')
      .select('id, nombre, cif')
      .order('nombre')
      .returns<{ id: string; nombre: string; cif: string | null }[]>();
    comprobar(error);
    return data ?? [];
  }

  async crearEmpresa(nombre: string, cif: string | null) {
    const { data, error } = await this.cliente
      .from('empresas')
      .insert({ nombre, cif })
      .select('id, nombre, cif')
      .single<{ id: string; nombre: string; cif: string | null }>();
    comprobar(error);
    if (!data) throw new Error('No se ha podido crear la empresa');
    return data;
  }

  async listarConvenios(centroId: string) {
    const { data, error } = await this.cliente
      .from('convenios')
      .select('centro_id, empresa_id, firmado_en, empresas(nombre)')
      .eq('centro_id', centroId)
      .returns<FilaConvenio[]>();
    comprobar(error);
    return (data ?? []).map((f): Convenio => ({
      centroId: f.centro_id,
      empresaId: f.empresa_id,
      empresaNombre: f.empresas?.nombre ?? 'Empresa',
      firmadoEn: f.firmado_en,
    }));
  }

  async crearConvenio(centroId: string, empresaId: string, firmadoEn: string | null) {
    const { error } = await this.cliente
      .from('convenios')
      .insert({ centro_id: centroId, empresa_id: empresaId, firmado_en: firmadoEn });
    comprobar(error);
  }

  async eliminarConvenio(centroId: string, empresaId: string) {
    const { error } = await this.cliente
      .from('convenios')
      .delete()
      .eq('centro_id', centroId)
      .eq('empresa_id', empresaId);
    comprobar(error);
  }
}
