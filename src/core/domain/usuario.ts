/**
 * - alumno: apunta cada día lo que ha hecho.
 * - empresa: tutor de la empresa; valora cada mes al alumno.
 * - profe: tutor del centro; gestiona a los alumnos que le asigna el admin y pone la valoración final.
 * - admin: lo ve y lo puede hacer todo; asigna cada alumno a su profe.
 */
export const ROLES = ['alumno', 'empresa', 'profe', 'admin'] as const;

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

/** Gestiona un dossier su profe tutor o el admin. */
export function gestionaDossier(usuario: Usuario, dossier: { tutorId: string | null }): boolean {
  return usuario.rol === 'admin' || (usuario.rol === 'profe' && usuario.id === dossier.tutorId);
}
