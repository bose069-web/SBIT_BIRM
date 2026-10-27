import type { Rol } from './usuario';

// Gestión de un centro (instituto): sus personas, a qué profe va cada alumno y con qué
// empresas tiene convenio para poder hacer prácticas.

export interface Centro {
  id: string;
  nombre: string;
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

/** Cuenta recién registrada que aún no pertenece a ningún centro ni empresa. */
export function esCuentaNueva(p: Persona): boolean {
  return p.rol === 'alumno' && p.centroId === null;
}
