export type Rol = 'alumno' | 'profesor' | 'familia' | 'administracion';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}
