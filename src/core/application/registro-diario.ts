import type { Dossier } from '../domain/dossier';
import { RegistroInvalidoError, SinPermisoError } from '../domain/errores';
import {
  comprobarBorrador,
  esEditable,
  type BorradorRegistro,
  type RegistroDiario,
} from '../domain/registro-diario';
import type { Usuario } from '../domain/usuario';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';

// La base de datos (RLS) también impide todo esto; aquí se comprueba antes para dar errores claros.

export function listarRegistros(
  registros: RegistroDiarioPort,
  dossierId: string,
  desde: string,
  hasta: string,
): Promise<RegistroDiario[]> {
  return registros.listar(dossierId, desde, hasta);
}

export async function guardarRegistro(
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorRegistro,
): Promise<RegistroDiario> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('registrar días en este dossier');
  comprobarBorrador(borrador, dossier);
  const existente = await registros.obtenerPorFecha(dossier.id, borrador.fecha);
  if (existente && !esEditable(existente)) {
    throw new RegistroInvalidoError('Este día ya está validado y no se puede cambiar');
  }
  return registros.guardar({ ...borrador, observaciones: borrador.observaciones?.trim() || null });
}

export async function eliminarRegistro(
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
): Promise<void> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('borrar días de este dossier');
  if (registro.estado !== 'pendiente')
    throw new RegistroInvalidoError('Solo se borran días pendientes');
  await registros.eliminar(registro.id);
}

function puedeValidar(usuario: Usuario, dossier: Dossier): boolean {
  return usuario.rol === 'admin' || (usuario.rol === 'profe' && usuario.id === dossier.tutorId);
}

export function validarRegistro(
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
): Promise<RegistroDiario> {
  if (!puedeValidar(usuario, dossier)) throw new SinPermisoError('validar días de este dossier');
  return registros.cambiarEstado(registro.id, 'validado', null);
}

export function rechazarRegistro(
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
  comentario: string,
): Promise<RegistroDiario> {
  if (!puedeValidar(usuario, dossier)) throw new SinPermisoError('rechazar días de este dossier');
  const motivo = comentario.trim();
  if (!motivo) throw new RegistroInvalidoError('Explica al alumno por qué se rechaza el día');
  return registros.cambiarEstado(registro.id, 'rechazado', motivo);
}

/** Valida de golpe todos los días pendientes de una lista (p. ej. una semana). */
export async function validarPendientes(
  registros: RegistroDiarioPort,
  usuario: Usuario,
  dossier: Dossier,
  lista: RegistroDiario[],
): Promise<RegistroDiario[]> {
  if (!puedeValidar(usuario, dossier)) throw new SinPermisoError('validar días de este dossier');
  const pendientes = lista.filter((r) => r.estado === 'pendiente');
  return Promise.all(pendientes.map((r) => registros.cambiarEstado(r.id, 'validado', null)));
}
