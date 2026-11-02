import type { SupabaseClient } from '@supabase/supabase-js';

import type { Centro, Convenio, Persona } from '@/core/domain/centro';
import {
  CorreoYaRegistradoError,
  DatosInvalidosError,
  SinPermisoError,
} from '@/core/domain/errores';
import { esRol } from '@/core/domain/usuario';
import type { GestionCentroPort } from '@/core/ports/gestion-centro-port';

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

type FilaAlta = Pick<FilaPersona, 'id' | 'nombre' | 'email' | 'centro_id' | 'profe_id'>;

/** Lo que responde la función de alta, en palabras del instituto. */
async function errorDeAlta(error: { context?: unknown } | null): Promise<Error> {
  const respuesta = error?.context;
  const cuerpo: unknown =
    respuesta instanceof Response ? await respuesta.json().catch(() => null) : null;
  const codigo = (cuerpo as { codigo?: string } | null)?.codigo;
  switch (codigo) {
    case 'correo_repetido':
      return new CorreoYaRegistradoError();
    case 'datos_invalidos':
      return new DatosInvalidosError('Revisa el nombre y el correo');
    case 'sin_permiso':
    case 'sin_sesion':
      return new SinPermisoError('dar de alta alumnos en este centro');
    default:
      return new Error('No se ha podido crear la cuenta. Inténtalo de nuevo.');
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

interface FilaCentro {
  id: string;
  nombre: string;
  codigo: string | null;
  dado_de_baja_en: string | null;
  motivo_baja: string | null;
}

const aCentro = (f: FilaCentro): Centro => ({
  id: f.id,
  nombre: f.nombre,
  codigo: f.codigo,
  dadoDeBajaEn: f.dado_de_baja_en,
  motivoBaja: f.motivo_baja,
});

// RLS y el trigger proteger_perfil deciden qué puede ver y cambiar cada uno.
export class GestionCentroSupabase implements GestionCentroPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listarCentros(): Promise<Centro[]> {
    const { data, error } = await this.cliente
      .from('centros')
      .select('id, nombre, codigo, dado_de_baja_en, motivo_baja')
      .order('nombre')
      .returns<FilaCentro[]>();
    comprobar(error);
    return (data ?? []).map(aCentro);
  }

  async editarCentro(centroId: string, datos: { nombre: string; codigo: string }) {
    const { data, error } = await this.cliente
      .from('centros')
      .update({ nombre: datos.nombre, codigo: datos.codigo })
      .eq('id', centroId)
      .select('id');
    comprobar(error);
    if (!data?.length) throw new Error('No tienes permiso para cambiar este centro');
  }

  async cambiarBajaCentro(centroId: string, motivo: string | null) {
    // La hora de la baja la pone la base de datos.
    const { data, error } = await this.cliente
      .from('centros')
      .update({ dado_de_baja_en: motivo ? new Date().toISOString() : null, motivo_baja: motivo })
      .eq('id', centroId)
      .select('id');
    comprobar(error);
    if (!data?.length) throw new Error('No tienes permiso para cambiar este centro');
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
      .select('id, nombre, codigo, dado_de_baja_en, motivo_baja')
      .eq('id', centroId)
      .maybeSingle<FilaCentro>();
    comprobar(error);
    return data ? aCentro(data) : null;
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
    const { data, error } = await this.cliente.functions.invoke<{ alumno: FilaAlta }>(
      'alta-alumno',
      { body: { ...datos, centroId } },
    );
    if (error || !data) throw await errorDeAlta(error);
    const { alumno } = data;
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      email: alumno.email,
      rol: 'alumno' as const,
      centroId: alumno.centro_id,
      profeId: alumno.profe_id,
    };
  }

  async asignarProfe(alumnoId: string, profeId: string | null) {
    const { error } = await this.cliente
      .from('perfiles')
      .update({ profe_id: profeId })
      .eq('id', alumnoId);
    comprobar(error);
  }

  async asignarProfeEnBloque(alumnoIds: string[], profeId: string | null) {
    if (alumnoIds.length === 0) return;
    const { data, error } = await this.cliente
      .from('perfiles')
      .update({ profe_id: profeId })
      .in('id', alumnoIds)
      .eq('rol', 'alumno')
      .select('id');
    comprobar(error);
    // RLS omite sin error las filas ajenas: no se puede dar por movido lo que no se ha movido.
    if (data?.length !== new Set(alumnoIds).size) {
      throw new SinPermisoError('reasignar a todos estos alumnos');
    }
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
