import {
  comprobarEmail,
  comprobarNombre,
  puedeCambiarSuEmail,
  puedeCambiarSuNombre,
  limpiarDatosPersonales,
  type DatosPersonales,
  type ResultadoCambioEmail,
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

/**
 * El correo de acceso solo lo cambia quien no depende de un centro (el tutor de empresa).
 * Devuelve el correo limpio y si el cambio ya vale o hay que confirmarlo desde el buzón.
 */
export async function cambiarEmail(
  perfil: PerfilPort,
  usuario: Usuario,
  email: string,
): Promise<{ email: string; estado: ResultadoCambioEmail }> {
  if (!puedeCambiarSuEmail(usuario.rol)) throw new SinPermisoError('cambiar tu correo');
  const limpio = comprobarEmail(email);
  return { email: limpio, estado: await perfil.cambiarEmail(limpio) };
}
