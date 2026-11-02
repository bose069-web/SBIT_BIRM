import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { comprobarContrasena, comprobarEmail } from '../domain/perfil';
import type { CredencialRecuperacion, SolicitudContrasena } from '../domain/recuperacion';
import type { Usuario } from '../domain/usuario';
import type { RecuperacionPort } from '../ports/recuperacion-port';

export async function pedirRecuperacion(
  port: RecuperacionPort,
  email: string,
  urlVuelta: string,
): Promise<void> {
  await port.pedir(comprobarEmail(email), urlVuelta);
}

function exigirProfe(usuario: Usuario) {
  if (usuario.rol !== 'profe') throw new SinPermisoError('atender estas solicitudes');
}

export async function solicitudesPendientes(
  port: RecuperacionPort,
  usuario: Usuario,
): Promise<SolicitudContrasena[]> {
  exigirProfe(usuario);
  return port.listarPendientes();
}

export async function generarTokenRecuperacion(
  port: RecuperacionPort,
  usuario: Usuario,
  solicitudId: string,
): Promise<string> {
  exigirProfe(usuario);
  return port.generarToken(solicitudId);
}

export async function restablecerContrasena(
  port: RecuperacionPort,
  credencial: CredencialRecuperacion,
  contrasena: string,
  repetida: string,
): Promise<void> {
  const valida = comprobarContrasena(contrasena);
  if (valida !== repetida) throw new DatosInvalidosError('Las contraseñas no coinciden');
  await port.restablecer(credencial, valida);
}
