import {
  comprobarNombre,
  puedeCambiarSuNombre,
  limpiarDatosPersonales,
  type DatosPersonales,
} from '../domain/perfil';
import { SinPermisoError } from '../domain/errores';
import type { Usuario } from '../domain/usuario';
import type { PerfilPort } from '../ports/perfil-port';

// Cada uno edita solo lo suyo; la base (RLS y la función cambiar_mi_nombre) también lo impide.

export function obtenerDatosPersonales(perfil: PerfilPort): Promise<DatosPersonales> {
  return perfil.obtener();
}

export function guardarDatosPersonales(
  perfil: PerfilPort,
  usuario: Usuario,
  datos: DatosPersonales,
): Promise<DatosPersonales> {
  return perfil.guardar(limpiarDatosPersonales(datos, usuario.rol));
}

/** Devuelve el nombre limpio, para actualizar la sesión. */
export async function cambiarNombre(
  perfil: PerfilPort,
  usuario: Usuario,
  nombre: string,
): Promise<string> {
  if (!puedeCambiarSuNombre(usuario.rol)) throw new SinPermisoError('cambiar tu nombre');
  const limpio = comprobarNombre(nombre);
  await perfil.cambiarNombre(limpio);
  return limpio;
}
