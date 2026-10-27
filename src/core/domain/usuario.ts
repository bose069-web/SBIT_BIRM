/**
 * Roles del modelo entidad-relación del equipo:
 * - generalitat: ve todos los institutos (solo lectura) y da de alta institutos.
 * - instituto: administra su centro; asigna cada alumno a su profe y crea los dossiers.
 * - profe: tutor del centro; gestiona solo a los alumnos que le asigna su instituto.
 * - empresa: tutor de empresa; valora cada mes a sus alumnos.
 * - alumno: apunta cada día lo que ha hecho.
 */
export const ROLES = ['alumno', 'empresa', 'profe', 'instituto', 'generalitat'] as const;

export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  /** Centro de alumnos, profes e institutos; null para empresa y generalitat. */
  centroId: string | null;
}

/** Gestionan un dossier su profe tutor y el instituto de su centro. */
export function gestionaDossier(
  usuario: Usuario,
  dossier: { tutorId: string | null; centroId: string },
): boolean {
  if (usuario.rol === 'profe') return usuario.id === dossier.tutorId;
  if (usuario.rol === 'instituto') return usuario.centroId === dossier.centroId;
  return false;
}

/** Roles que hacen seguimiento de varios dossiers (panel de seguimiento). */
export function haceSeguimiento(rol: Rol): boolean {
  return rol === 'profe' || rol === 'instituto' || rol === 'generalitat';
}
