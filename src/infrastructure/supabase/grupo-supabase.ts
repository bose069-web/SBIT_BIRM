import { DatosInvalidosError, SinPermisoError } from '@/core/domain/errores';
import type { AlumnoEnClase, BorradorGrupo, Grupo } from '@/core/domain/grupo';
import type { GrupoPort } from '@/core/ports/grupo-port';
import type { SupabaseClient } from '@supabase/supabase-js';

interface FilaGrupo {
  id: string;
  centro_id: string;
  ciclo: string;
  curso: number;
  letra: string;
}

interface FilaAlumno {
  id: string;
  nombre: string;
  grupo_id: string | null;
}

const COLUMNAS = 'id, centro_id, ciclo, curso, letra';

function aGrupo(f: FilaGrupo): Grupo {
  return {
    id: f.id,
    centroId: f.centro_id,
    ciclo: f.ciclo,
    curso: f.curso,
    letra: f.letra,
  };
}

function lanzar(error: { message: string; code?: string }): never {
  // 23505: clase repetida en el mismo centro.
  if (error.code === '23505') {
    throw new DatosInvalidosError('Ya hay una clase así en este centro');
  }
  if (error.code === '42501') throw new SinPermisoError('cambiar las clases de este centro');
  // Los `raise exception` de los triggers ya vienen escritos para el usuario.
  throw new Error(error.message);
}

// RLS y los triggers de `grupos` y `perfiles` deciden quién crea, cambia y a qué clase va cada uno.
export class GrupoSupabase implements GrupoPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listarPorCentro(centroId: string) {
    const { data, error } = await this.cliente
      .from('grupos')
      .select(COLUMNAS)
      .eq('centro_id', centroId)
      .order('ciclo')
      .order('curso')
      .order('letra')
      .returns<FilaGrupo[]>();
    if (error) lanzar(error);
    return data.map(aGrupo);
  }

  async crear(b: BorradorGrupo) {
    const { data, error } = await this.cliente
      .from('grupos')
      .insert({ centro_id: b.centroId, ciclo: b.ciclo, curso: b.curso, letra: b.letra })
      .select(COLUMNAS)
      .single<FilaGrupo>();
    if (error) lanzar(error);
    return aGrupo(data);
  }

  async actualizar(b: BorradorGrupo) {
    if (!b.id) throw new DatosInvalidosError('Elige la clase que quieres cambiar');
    const { data, error } = await this.cliente
      .from('grupos')
      .update({ ciclo: b.ciclo, curso: b.curso, letra: b.letra })
      .eq('id', b.id)
      .select(COLUMNAS)
      .single<FilaGrupo>();
    if (error) lanzar(error);
    return aGrupo(data);
  }

  async borrar(id: string) {
    const { error } = await this.cliente.from('grupos').delete().eq('id', id);
    if (error) lanzar(error);
  }

  async listarAlumnos(centroId: string) {
    const { data, error } = await this.cliente
      .from('perfiles')
      .select('id, nombre, grupo_id')
      .eq('rol', 'alumno')
      .eq('centro_id', centroId)
      .order('nombre')
      .returns<FilaAlumno[]>();
    if (error) lanzar(error);
    return data.map(
      (f): AlumnoEnClase => ({ id: f.id, nombre: f.nombre, grupoId: f.grupo_id }),
    );
  }

  async asignarEnBloque(grupoId: string, alumnoIds: string[]) {
    if (alumnoIds.length === 0) return;
    const { error } = await this.cliente
      .from('perfiles')
      .update({ grupo_id: grupoId })
      .in('id', alumnoIds);
    if (error) lanzar(error);
  }

  async quitarDeClase(alumnoIds: string[]) {
    if (alumnoIds.length === 0) return;
    const { error } = await this.cliente
      .from('perfiles')
      .update({ grupo_id: null })
      .in('id', alumnoIds);
    if (error) lanzar(error);
  }
}
