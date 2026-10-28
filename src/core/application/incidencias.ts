import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  atiendeIncidencia,
  comprobarIncidencia,
  ordenarIncidencias,
  type BorradorIncidencia,
  type CambiosIncidencia,
  type Incidencia,
} from '../domain/incidencia';
import type { Usuario } from '../domain/usuario';
import type { IncidenciaPort } from '../ports/incidencia-port';

// RLS y los triggers preparar_incidencia y proteger_incidencia también lo impiden en la base;
// aquí se avisa antes con errores claros.

export interface BandejaIncidencias {
  /** Las que tengo que atender (instituto y generalitat). */
  porAtender: Incidencia[];
  /** Las que he abierto yo. */
  mias: Incidencia[];
  /** Pendientes (abiertas o en curso) de las que atiendo. */
  pendientes: number;
}

export async function obtenerBandeja(
  incidencias: IncidenciaPort,
  usuario: Usuario,
): Promise<BandejaIncidencias> {
  const todas = await incidencias.listar();
  const porAtender = ordenarIncidencias(
    todas.filter((i) => i.creadaPor !== usuario.id && atiendeIncidencia(usuario, i)),
  );
  return {
    porAtender,
    mias: ordenarIncidencias(todas.filter((i) => i.creadaPor === usuario.id)),
    pendientes: porAtender.filter((i) => i.estado !== 'resuelta').length,
  };
}

export function abrirIncidencia(
  incidencias: IncidenciaPort,
  borrador: BorradorIncidencia,
): Promise<Incidencia> {
  const limpio = {
    ...borrador,
    titulo: borrador.titulo.trim(),
    descripcion: borrador.descripcion.trim(),
  };
  comprobarIncidencia(limpio);
  return incidencias.abrir(limpio);
}

export function corregirIncidencia(
  incidencias: IncidenciaPort,
  usuario: Usuario,
  incidencia: Incidencia,
  titulo: string,
  descripcion: string,
): Promise<Incidencia> {
  if (incidencia.creadaPor !== usuario.id) throw new SinPermisoError('corregir esta incidencia');
  if (incidencia.estado !== 'abierta') {
    throw new DatosInvalidosError('Ya la están atendiendo: añade lo que falte en una nueva');
  }
  const limpio = { ...incidencia, titulo: titulo.trim(), descripcion: descripcion.trim() };
  comprobarIncidencia(limpio);
  return incidencias.corregir(incidencia.id, limpio.titulo, limpio.descripcion);
}

export function atenderIncidencia(
  incidencias: IncidenciaPort,
  usuario: Usuario,
  incidencia: Incidencia,
  cambios: CambiosIncidencia,
): Promise<Incidencia> {
  if (!atiendeIncidencia(usuario, incidencia)) throw new SinPermisoError('atender esta incidencia');
  const respuesta = cambios.respuesta === undefined ? undefined : cambios.respuesta?.trim() || null;
  if (cambios.estado === 'resuelta' && !(respuesta ?? incidencia.respuesta)) {
    throw new DatosInvalidosError('Escribe cómo se ha resuelto antes de cerrarla');
  }
  return incidencias.atender(incidencia.id, { ...cambios, respuesta });
}

/** El instituto pasa a la generalitat lo que le supera. */
export function escalarIncidencia(
  incidencias: IncidenciaPort,
  usuario: Usuario,
  incidencia: Incidencia,
  motivo: string,
): Promise<Incidencia> {
  if (usuario.rol !== 'instituto' || !atiendeIncidencia(usuario, incidencia)) {
    throw new SinPermisoError('escalar esta incidencia');
  }
  if (incidencia.escalada) throw new DatosInvalidosError('Ya está escalada a la generalitat');
  if (incidencia.estado === 'resuelta') throw new DatosInvalidosError('Ya está resuelta');
  if (!motivo.trim()) throw new DatosInvalidosError('Explica por qué la escalas');
  return incidencias.atender(incidencia.id, {
    escalada: true,
    estado: 'en_curso',
    respuesta: motivo.trim(),
  });
}

/** Solo la generalitat, para duplicados o spam. */
export function borrarIncidencia(
  incidencias: IncidenciaPort,
  usuario: Usuario,
  incidencia: Incidencia,
): Promise<void> {
  if (usuario.rol !== 'generalitat') throw new SinPermisoError('borrar incidencias');
  return incidencias.borrar(incidencia.id);
}
