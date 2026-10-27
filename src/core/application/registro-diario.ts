import type { Dossier } from '../domain/dossier';
import { RegistroInvalidoError, SinPermisoError } from '../domain/errores';
import {
  comprobarBorrador,
  type BorradorRegistro,
  type RegistroDiario,
} from '../domain/registro-diario';
import type { Usuario } from '../domain/usuario';
import { mesCerrado } from '../domain/valoracion';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import type { ValoracionPort } from '../ports/valoracion-port';

// La base de datos (RLS) también impide todo esto; aquí se comprueba antes para dar errores claros.

export function listarRegistros(
  registros: RegistroDiarioPort,
  dossierId: string,
  desde: string,
  hasta: string,
): Promise<RegistroDiario[]> {
  return registros.listar(dossierId, desde, hasta);
}

async function comprobarMesAbierto(
  valoraciones: ValoracionPort,
  dossier: Dossier,
  fecha: string,
): Promise<void> {
  const [mensuales, final] = await Promise.all([
    valoraciones.listarMensuales(dossier.id),
    valoraciones.obtenerFinal(dossier.id),
  ]);
  if (mesCerrado(fecha, mensuales, final)) {
    throw new RegistroInvalidoError('Este mes ya está valorado y no se puede cambiar');
  }
}

export async function guardarRegistro(
  registros: RegistroDiarioPort,
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorRegistro,
): Promise<RegistroDiario> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('registrar días en este dossier');
  comprobarBorrador(borrador, dossier);
  await comprobarMesAbierto(valoraciones, dossier, borrador.fecha);
  return registros.guardar({ ...borrador, observaciones: borrador.observaciones?.trim() || null });
}

export async function eliminarRegistro(
  registros: RegistroDiarioPort,
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
): Promise<void> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('borrar días de este dossier');
  await comprobarMesAbierto(valoraciones, dossier, registro.fecha);
  await registros.eliminar(registro.id);
}
