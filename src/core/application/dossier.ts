import type { Convenio, Persona } from '../domain/centro';
import { comprobarDossier, type BorradorDossier, type Dossier } from '../domain/dossier';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { resumirHoras, type ResumenHoras } from '../domain/registro-diario';
import { gestionaDossier, type Usuario } from '../domain/usuario';
import type { DossierPort } from '../ports/dossier-port';
import type { GestionCentroPort } from '../ports/gestion-centro-port';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import { administraCentro } from './centro';

export function listarDossiers(dossiers: DossierPort): Promise<Dossier[]> {
  return dossiers.listar();
}

/** El alumno tiene un dossier activo: el que incluye hoy o, si no, el más reciente. */
export async function obtenerDossierActual(
  dossiers: DossierPort,
  hoy: string,
): Promise<Dossier | null> {
  const lista = await dossiers.listar();
  const ordenados = [...lista].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  return ordenados.find((d) => hoy >= d.fechaInicio && hoy <= d.fechaFin) ?? ordenados[0] ?? null;
}

export async function obtenerResumenHoras(
  dossier: Dossier,
  registros: RegistroDiarioPort,
): Promise<ResumenHoras> {
  const todos = await registros.listar(dossier.id, dossier.fechaInicio, dossier.fechaFin);
  return resumirHoras(dossier, todos);
}

// Gestión de dossiers. RLS, el trigger comprobar_roles_dossier y la función guardar_dossier
// también lo impiden en la base; aquí se avisa antes con errores claros.

/** Crean dossiers el instituto del centro, la generalitat y los profes del centro. */
export function puedeCrearDossier(usuario: Usuario, centroId: string): boolean {
  return (
    administraCentro(usuario, centroId) ||
    (usuario.rol === 'profe' && usuario.centroId === centroId)
  );
}

/** Lo que necesita el formulario para elegir alumno y empresa. */
export interface OpcionesDossier {
  /** Solo alumnos con profe asignado: sin profe no se puede crear el dossier. */
  alumnos: Persona[];
  /** Alumnos del centro que aún no tienen profe (para avisar). */
  alumnosSinProfe: Persona[];
  /** Empresas con convenio con el centro. */
  convenios: Convenio[];
}

export async function obtenerOpcionesDossier(
  centros: GestionCentroPort,
  usuario: Usuario,
  centroId: string,
): Promise<OpcionesDossier> {
  if (!puedeCrearDossier(usuario, centroId)) throw new SinPermisoError('crear dossiers aquí');
  const [personas, convenios] = await Promise.all([
    centros.listarPersonas(centroId),
    centros.listarConvenios(centroId),
  ]);
  const delCentro = personas
    .filter((p) => p.rol === 'alumno' && p.centroId === centroId)
    .filter((p) => usuario.rol !== 'profe' || p.profeId === usuario.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return {
    alumnos: delCentro.filter((p) => p.profeId !== null),
    alumnosSinProfe: delCentro.filter((p) => p.profeId === null),
    convenios: [...convenios].sort((a, b) => a.empresaNombre.localeCompare(b.empresaNombre, 'es')),
  };
}

export function listarTutoresEmpresa(
  centros: GestionCentroPort,
  empresaId: string,
): Promise<Persona[]> {
  return centros.listarTutoresEmpresa(empresaId);
}

/** Actividades del dossier que ya tienen horas registradas: no se pueden quitar. */
async function actividadesConHoras(
  registros: RegistroDiarioPort,
  dossier: Dossier,
): Promise<Set<string>> {
  const todos = await registros.listar(dossier.id, dossier.fechaInicio, dossier.fechaFin);
  return new Set(todos.flatMap((r) => r.horas.map((h) => h.actividadId)));
}

/**
 * Crea (sin `actual`) o edita (con `actual`) un dossier. Al editar no se puede cambiar el alumno
 * ni el centro, ni quitar actividades que ya tienen horas.
 */
export async function guardarDossier(
  dossiers: DossierPort,
  registros: RegistroDiarioPort,
  usuario: Usuario,
  borrador: BorradorDossier,
  actual: Dossier | null = null,
): Promise<Dossier> {
  const limpio: BorradorDossier = {
    ...borrador,
    id: actual?.id ?? null,
    ciclo: borrador.ciclo.trim(),
    actividades: borrador.actividades.map((a) => ({ ...a, descripcion: a.descripcion.trim() })),
  };
  if (actual) {
    if (!gestionaDossier(usuario, actual)) throw new SinPermisoError('editar este dossier');
    if (limpio.alumnoId !== actual.alumnoId || limpio.centroId !== actual.centroId) {
      throw new DatosInvalidosError('No se puede cambiar el alumno ni el centro de un dossier');
    }
  } else if (!puedeCrearDossier(usuario, limpio.centroId)) {
    throw new SinPermisoError('crear dossiers en este centro');
  }
  comprobarDossier(limpio);
  if (actual) {
    const conservadas = new Set(limpio.actividades.map((a) => a.id));
    const conHoras = await actividadesConHoras(registros, actual);
    const quitada = actual.actividades.find((a) => !conservadas.has(a.id) && conHoras.has(a.id));
    if (quitada) {
      throw new DatosInvalidosError(
        `No se puede quitar «${quitada.descripcion}»: ya tiene horas registradas`,
      );
    }
  }
  return dossiers.guardar(limpio);
}

/** Solo el instituto del centro o la generalitat, y solo si el alumno aún no ha registrado nada. */
export async function borrarDossier(
  dossiers: DossierPort,
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
): Promise<void> {
  if (!administraCentro(usuario, dossier.centroId))
    throw new SinPermisoError('borrar este dossier');
  const hechos = await registros.listar(dossier.id, dossier.fechaInicio, dossier.fechaFin);
  if (hechos.length > 0) {
    throw new DatosInvalidosError('No se puede borrar: el alumno ya ha registrado días');
  }
  await dossiers.borrar(dossier.id);
}
