/**
 * - alumno: apunta cada día lo que ha hecho.
 * - empresa: tutor de la empresa; valora cada mes al alumno.
 * - profe: tutor del centro y administrador; lo gestiona todo y pone la valoración final.
 */
export const ROLES = ['alumno', 'empresa', 'profe'] as const;

export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}
