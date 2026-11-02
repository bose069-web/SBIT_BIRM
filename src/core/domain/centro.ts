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

export function estaDeBaja(c: Pick<Centro, 'dadoDeBajaEn'>): boolean {
  return !!c.dadoDeBajaEn;
}

/** Sin mayúsculas ni acentos: «vidal» encuentra «Vidal i Barraquer». */
const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Activos primero y después los de baja, cada grupo por nombre. */
export function ordenarInstitutos(centros: Centro[]): Centro[] {
  return [...centros].sort(
    (a, b) =>
      Number(estaDeBaja(a)) - Number(estaDeBaja(b)) || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

/** Institutos cuyo nombre o código contiene el texto buscado. */
export function buscarInstitutos(centros: Centro[], texto: string): Centro[] {
  const t = normalizar(texto.trim());
  if (!t) return centros;
  return centros.filter((c) => normalizar(`${c.nombre} ${c.codigo ?? ''}`).includes(t));
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
