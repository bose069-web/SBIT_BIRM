import type { Dossier } from '../domain/dossier';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  comprobarGrupo,
  normalizarGrupo,
  ordenarGrupos,
  type BorradorGrupo,
  type Grupo,
} from '../domain/grupo';
import type { Usuario } from '../domain/usuario';
import type { DossierPort } from '../ports/dossier-port';
import type { GrupoPort } from '../ports/grupo-port';
import { administraCentro } from './centro';

// La base de datos (RLS y el trigger comprobar_grupo_perfil) también lo impide; aquí se avisa antes.

/** Las clases del centro las ven los suyos y la generalitat; nadie más tiene nada que ver aquí. */
export async function listarClases(
  grupos: GrupoPort,
  usuario: Usuario,
  centroId: string,
): Promise<Grupo[]> {
  const puedeVer = usuario.rol === 'generalitat' || usuario.centroId === centroId;
  if (!puedeVer) throw new SinPermisoError('ver las clases de este centro');
  return ordenarGrupos(await grupos.listarPorCentro(centroId));
}

export async function crearGrupo(
  grupos: GrupoPort,
  usuario: Usuario,
  borrador: BorradorGrupo,
): Promise<Grupo> {
  if (!administraCentro(usuario, borrador.centroId)) {
    throw new SinPermisoError('crear clases en este centro');
  }
  const limpio = normalizarGrupo(borrador);
  comprobarGrupo(limpio);
  return grupos.crear({ ...limpio, id: null });
}

/** Cambia el nombre de una clase ya creada; el centro y el id salen de la clase, no del formulario. */
export async function editarGrupo(
  grupos: GrupoPort,
  usuario: Usuario,
  grupo: Grupo,
  cambios: Pick<BorradorGrupo, 'ciclo' | 'curso' | 'letra'>,
): Promise<Grupo> {
  if (!administraCentro(usuario, grupo.centroId)) {
    throw new SinPermisoError('cambiar las clases de este centro');
  }
  const limpio = normalizarGrupo({ ...cambios, id: grupo.id, centroId: grupo.centroId });
  comprobarGrupo(limpio);
  return grupos.actualizar(limpio);
}

export async function borrarGrupo(
  grupos: GrupoPort,
  usuario: Usuario,
  grupo: Grupo,
): Promise<void> {
  if (!administraCentro(usuario, grupo.centroId)) {
    throw new SinPermisoError('borrar clases de este centro');
  }
  await grupos.borrar(grupo.id);
}

/** Mete alumnos del centro en la clase, todos de una vez. */
export async function asignarAlumnosAClase(
  grupos: GrupoPort,
  usuario: Usuario,
  grupo: Grupo,
  alumnoIds: string[],
): Promise<void> {
  if (!administraCentro(usuario, grupo.centroId)) {
    throw new SinPermisoError('cambiar la clase de estos alumnos');
  }
  if (alumnoIds.length === 0) throw new DatosInvalidosError('Elige al menos un alumno');
  const delCentro = new Set((await grupos.listarAlumnos(grupo.centroId)).map((a) => a.id));
  if (alumnoIds.some((id) => !delCentro.has(id))) {
    throw new DatosInvalidosError('Solo los alumnos del centro van a una de sus clases');
  }
  await grupos.asignarEnBloque(grupo.id, alumnoIds);
}

export async function quitarAlumnosDeClase(
  grupos: GrupoPort,
  usuario: Usuario,
  grupo: Grupo,
  alumnoIds: string[],
): Promise<void> {
  if (!administraCentro(usuario, grupo.centroId)) {
    throw new SinPermisoError('cambiar la clase de estos alumnos');
  }
  if (alumnoIds.length === 0) throw new DatosInvalidosError('Elige al menos un alumno');
  await grupos.quitarDeClase(alumnoIds);
}

export interface ClaseDelProfe {
  grupo: Grupo;
  alumnos: { id: string; nombre: string }[];
}

/** Las clases del centro en las que el profe con sesión tiene alumnos tutorizados. */
export async function misClases(
  grupos: GrupoPort,
  dossiers: DossierPort,
  usuario: Usuario,
): Promise<ClaseDelProfe[]> {
  if (usuario.rol !== 'profe') throw new SinPermisoError('ver tus clases');
  if (!usuario.centroId) return [];
  const centroId = usuario.centroId;
  const [clases, alumnos, todos] = await Promise.all([
    grupos.listarPorCentro(centroId),
    grupos.listarAlumnos(centroId),
    dossiers.listar(),
  ]);
  const suyos = new Set(
    todos.filter((d: Dossier) => d.tutorId === usuario.id).map((d) => d.alumnoId),
  );
  const porClase = new Map<string, { id: string; nombre: string }[]>();
  for (const alumno of alumnos) {
    if (!alumno.grupoId || !suyos.has(alumno.id)) continue;
    const deClase = porClase.get(alumno.grupoId) ?? [];
    deClase.push({ id: alumno.id, nombre: alumno.nombre });
    porClase.set(alumno.grupoId, deClase);
  }
  return ordenarGrupos(clases)
    .filter((grupo) => porClase.has(grupo.id))
    .map((grupo) => ({ grupo, alumnos: porClase.get(grupo.id) ?? [] }));
}
