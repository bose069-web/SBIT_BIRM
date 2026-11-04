import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  comprobarHoraRecordatorio,
  HORA_RECORDATORIO_INICIAL,
  TEXTO_RECORDATORIO,
  type HoraRecordatorio,
} from '../domain/recordatorio';
import type { Usuario } from '../domain/usuario';
import type { RecordatorioPort } from '../ports/recordatorio-port';

function exigirAlumno(usuario: Usuario) {
  if (usuario.rol !== 'alumno') throw new SinPermisoError('activar el recordatorio diario');
}

async function exigirPermiso(port: RecordatorioPort) {
  if (!port.disponible) throw new DatosInvalidosError('Este dispositivo no admite notificaciones');
  if (!(await port.pedirPermiso()))
    throw new DatosInvalidosError('Permite las notificaciones de Kampus en los ajustes del móvil');
}

export async function activarRecordatorio(
  port: RecordatorioPort,
  usuario: Usuario,
  hora: HoraRecordatorio = HORA_RECORDATORIO_INICIAL,
): Promise<void> {
  exigirAlumno(usuario);
  const valida = comprobarHoraRecordatorio(hora);
  await exigirPermiso(port);
  await port.programarDiario(valida, TEXTO_RECORDATORIO);
}

export async function desactivarRecordatorio(port: RecordatorioPort): Promise<void> {
  if (port.disponible) await port.cancelar();
}

export async function recordatorioActivo(port: RecordatorioPort): Promise<boolean> {
  return port.disponible && port.estaProgramado();
}

export async function probarRecordatorio(port: RecordatorioPort, usuario: Usuario): Promise<void> {
  exigirAlumno(usuario);
  await exigirPermiso(port);
  await port.programarPrueba(5, TEXTO_RECORDATORIO);
}
