import {
  esCuentaNueva,
  type Centro,
  type Convenio,
  type Empresa,
  type Persona,
} from '../domain/centro';
import { SinPermisoError } from '../domain/errores';
import { comprobarContrasena, comprobarEmail, comprobarNombre } from '../domain/perfil';
import type { Usuario } from '../domain/usuario';
import type { GestionCentroPort } from '../ports/gestion-centro-port';

// La base de datos (RLS y triggers) también impide todo esto; aquí se comprueba antes para dar
// errores claros.

export class GestionCentroError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'GestionCentroError';
  }
}

/** Administran un centro su instituto y la generalitat. */
export function administraCentro(usuario: Usuario, centroId: string): boolean {
  return (
    usuario.rol === 'generalitat' || (usuario.rol === 'instituto' && usuario.centroId === centroId)
  );
}

function exigirAdministrar(usuario: Usuario, centroId: string) {
  if (!administraCentro(usuario, centroId)) throw new SinPermisoError('administrar este centro');
}

export interface PanelCentro {
  centro: Centro;
  alumnos: Persona[];
  profes: Persona[];
  cuentasNuevas: Persona[];
  convenios: Convenio[];
  /** Empresas con las que el centro todavía no tiene convenio. */
  empresasSinConvenio: Empresa[];
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

/** Todos los centros, incluidos los que todavía no tienen alumnos ni dossiers. */
export async function listarCentros(port: GestionCentroPort): Promise<Centro[]> {
  return [...(await port.listarCentros())].sort(porNombre);
}

/** Solo la generalitat da de alta centros. El código conserva sus ceros iniciales. */
export async function crearCentro(
  port: GestionCentroPort,
  usuario: Usuario,
  datos: { nombre: string; codigo: string },
): Promise<Centro> {
  if (usuario.rol !== 'generalitat') throw new SinPermisoError('crear centros');
  const nombre = datos.nombre.trim();
  const codigo = datos.codigo.trim();
  if (!nombre) throw new GestionCentroError('Escribe el nombre del centro');
  if (!/^[0-9]{8}$/.test(codigo)) {
    throw new GestionCentroError('El código del centro debe tener 8 dígitos');
  }
  return port.crearCentro({ nombre, codigo });
}

export async function obtenerPanelCentro(
  port: GestionCentroPort,
  usuario: Usuario,
  centroId: string,
): Promise<PanelCentro> {
  exigirAdministrar(usuario, centroId);
  const [centro, personas, convenios, empresas] = await Promise.all([
    port.obtenerCentro(centroId),
    port.listarPersonas(centroId),
    port.listarConvenios(centroId),
    port.listarEmpresas(),
  ]);
  if (!centro) throw new GestionCentroError('No se encuentra el centro');
  const conConvenio = new Set(convenios.map((c) => c.empresaId));
  return {
    centro,
    alumnos: personas.filter((p) => p.rol === 'alumno' && p.centroId === centroId).sort(porNombre),
    profes: personas.filter((p) => p.rol === 'profe' && p.centroId === centroId).sort(porNombre),
    cuentasNuevas: personas.filter(esCuentaNueva).sort(porNombre),
    convenios: [...convenios].sort((a, b) => a.empresaNombre.localeCompare(b.empresaNombre, 'es')),
    empresasSinConvenio: empresas.filter((e) => !conConvenio.has(e.id)).sort(porNombre),
  };
}

export async function incorporarAlumno(
  port: GestionCentroPort,
  usuario: Usuario,
  persona: Persona,
  centroId: string,
): Promise<void> {
  exigirAdministrar(usuario, centroId);
  if (!esCuentaNueva(persona)) {
    throw new GestionCentroError('Solo se pueden incorporar cuentas nuevas sin centro');
  }
  await port.incorporarAlumno(persona.id, centroId);
}

/** Crea la cuenta de un alumno ya dentro del centro, sin profe todavía. */
export async function darDeAltaAlumno(
  port: GestionCentroPort,
  usuario: Usuario,
  datos: { nombre: string; email: string; contrasena: string },
  centroId: string,
): Promise<Persona> {
  exigirAdministrar(usuario, centroId);
  if (datos.nombre.trim().length < 2) {
    throw new GestionCentroError('Escribe el nombre y los apellidos del alumno');
  }
  return port.crearAlumno(
    {
      nombre: comprobarNombre(datos.nombre),
      email: comprobarEmail(datos.email),
      contrasena: comprobarContrasena(datos.contrasena),
    },
    centroId,
  );
}

/** Asigna (o quita, con `profe` null) el profe de un alumno. Sus dossiers pasan al nuevo profe. */
export async function asignarProfe(
  port: GestionCentroPort,
  usuario: Usuario,
  alumno: Persona,
  profe: Persona | null,
): Promise<void> {
  if (alumno.rol !== 'alumno' || !alumno.centroId) {
    throw new GestionCentroError('Solo se asigna profe a alumnos de un centro');
  }
  exigirAdministrar(usuario, alumno.centroId);
  if (profe && (profe.rol !== 'profe' || profe.centroId !== alumno.centroId)) {
    throw new GestionCentroError('El profe tiene que ser del mismo centro que el alumno');
  }
  await port.asignarProfe(alumno.id, profe?.id ?? null);
}

export async function darDeAltaEmpresa(
  port: GestionCentroPort,
  usuario: Usuario,
  nombre: string,
  cif: string,
): Promise<Empresa> {
  if (usuario.rol !== 'instituto' && usuario.rol !== 'generalitat') {
    throw new SinPermisoError('dar de alta empresas');
  }
  const limpio = nombre.trim();
  if (limpio.length < 2) throw new GestionCentroError('Escribe el nombre de la empresa');
  return port.crearEmpresa(limpio, cif.trim().toUpperCase() || null);
}

export async function firmarConvenio(
  port: GestionCentroPort,
  usuario: Usuario,
  centroId: string,
  empresaId: string,
  firmadoEn: string | null,
): Promise<void> {
  exigirAdministrar(usuario, centroId);
  await port.crearConvenio(centroId, empresaId, firmadoEn);
}

export async function quitarConvenio(
  port: GestionCentroPort,
  usuario: Usuario,
  convenio: Convenio,
): Promise<void> {
  exigirAdministrar(usuario, convenio.centroId);
  await port.eliminarConvenio(convenio.centroId, convenio.empresaId);
}
