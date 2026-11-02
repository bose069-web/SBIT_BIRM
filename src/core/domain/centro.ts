import type { Rol } from './usuario';

// Gestión de un centro (instituto): sus personas, a qué profe va cada alumno y con qué
// empresas tiene convenio para poder hacer prácticas.

export interface Centro {
  id: string;
  nombre: string;
  /** Los centros antiguos pueden no tener código asignado. */
  codigo: string | null;
  /** Fecha ISO de la baja; sin ella (o null), el instituto está activo. */
  dadoDeBajaEn?: string | null;
  motivoBaja?: string | null;
}

/** Cifras de un instituto para el panel de la generalitat. */
export interface CifrasCentro {
  centroId: string;
  alumnos: number;
  profes: number;
  /** Dossiers con las prácticas en marcha hoy. */
  dossiersActivos: number;
  empresasConvenio: number;
  horasHechas: number;
  horasPrevistas: number;
}

export function estaDeBaja(c: Pick<Centro, 'dadoDeBajaEn'>): boolean {
  return !!c.dadoDeBajaEn;
}

/** Instituto con sus cifras (a cero si aún no tiene nada). */
export interface CentroConCifras extends Centro {
  cifras: CifrasCentro;
}

export interface ResumenRed {
  institutos: number;
  institutosDeBaja: number;
  alumnos: number;
  dossiersActivos: number;
  empresasConvenio: number;
  /** Porcentaje de horas hechas sobre las previstas en toda la red (0-100). */
  porcentajeHoras: number;
}

const cifrasVacias = (centroId: string): CifrasCentro => ({
  centroId,
  alumnos: 0,
  profes: 0,
  dossiersActivos: 0,
  empresasConvenio: 0,
  horasHechas: 0,
  horasPrevistas: 0,
});

/**
 * Junta cada instituto con sus cifras: primero los activos y después los de baja, cada grupo por
 * nombre.
 */
export function juntarCifras(centros: Centro[], cifras: CifrasCentro[]): CentroConCifras[] {
  const porId = new Map(cifras.map((c) => [c.centroId, c]));
  return centros
    .map((c) => ({ ...c, cifras: porId.get(c.id) ?? cifrasVacias(c.id) }))
    .sort(
      (a, b) =>
        Number(estaDeBaja(a)) - Number(estaDeBaja(b)) || a.nombre.localeCompare(b.nombre, 'es'),
    );
}

/** Totales de la red. Las empresas se suman por convenio (una empresa puede repetirse). */
export function resumirRed(centros: CentroConCifras[]): ResumenRed {
  const activos = centros.filter((c) => !estaDeBaja(c));
  const suma = (f: (c: CifrasCentro) => number) => centros.reduce((t, c) => t + f(c.cifras), 0);
  const previstas = suma((c) => c.horasPrevistas);
  return {
    institutos: activos.length,
    institutosDeBaja: centros.length - activos.length,
    alumnos: suma((c) => c.alumnos),
    dossiersActivos: suma((c) => c.dossiersActivos),
    empresasConvenio: suma((c) => c.empresasConvenio),
    porcentajeHoras: previstas
      ? Math.min(100, Math.round((suma((c) => c.horasHechas) / previstas) * 100))
      : 0,
  };
}

export interface Persona {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  centroId: string | null;
  /** Profe asignado (solo alumnos). */
  profeId: string | null;
}

export interface Empresa {
  id: string;
  nombre: string;
  cif: string | null;
}

export interface Convenio {
  centroId: string;
  empresaId: string;
  empresaNombre: string;
  /** Fecha ISO `AAAA-MM-DD`. */
  firmadoEn: string | null;
}

/** Profe del centro con los alumnos que tiene asignados. */
export interface ProfeConAlumnos extends Persona {
  alumnos: Persona[];
}

/** Cuenta recién registrada que aún no pertenece a ningún centro ni empresa. */
export function esCuentaNueva(p: Persona): boolean {
  return p.rol === 'alumno' && p.centroId === null;
}
