export const ROLES = ['alumno', 'profe', 'admin'] as const;

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
