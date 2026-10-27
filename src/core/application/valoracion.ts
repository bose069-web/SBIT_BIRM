import type { Dossier } from '../domain/dossier';
import { SinPermisoError, ValoracionInvalidaError } from '../domain/errores';
import type { Usuario } from '../domain/usuario';
import {
  comprobarValoracionFinal,
  comprobarValoracionMensual,
  mesesSinValorar,
  type BorradorValoracionFinal,
  type BorradorValoracionMensual,
  type ValoracionFinal,
  type ValoracionMensual,
} from '../domain/valoracion';
import type { ValoracionPort } from '../ports/valoracion-port';

// La base de datos (RLS) también impide todo esto; aquí se comprueba antes para dar errores claros.

function puedeValorarMes(usuario: Usuario, dossier: Dossier): boolean {
  return (
    usuario.rol === 'profe' || (usuario.rol === 'empresa' && usuario.id === dossier.tutorEmpresaId)
  );
}

/** El tutor de empresa valora un mes. Cierra ese mes para el alumno. */
export async function valorarMes(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorValoracionMensual,
  hoy: string,
): Promise<ValoracionMensual> {
  if (!puedeValorarMes(usuario, dossier)) throw new SinPermisoError('valorar este dossier');
  comprobarValoracionMensual(borrador, dossier, hoy);
  if (usuario.rol !== 'profe' && (await valoraciones.obtenerFinal(dossier.id))) {
    throw new ValoracionInvalidaError('El profe ya ha puesto la valoración final');
  }
  return valoraciones.guardarMensual({
    ...borrador,
    comentario: borrador.comentario?.trim() || null,
  });
}

/** El profe pone la valoración final (apto / no apto). */
export function ponerValoracionFinal(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorValoracionFinal,
): Promise<ValoracionFinal> {
  if (usuario.rol !== 'profe') throw new SinPermisoError('poner la valoración final');
  comprobarValoracionFinal(borrador, dossier);
  return valoraciones.guardarFinal({
    ...borrador,
    comentario: borrador.comentario?.trim() || null,
  });
}

export interface Seguimiento {
  mensuales: ValoracionMensual[];
  final: ValoracionFinal | null;
  /** Meses ya acabados que la empresa aún no ha valorado (`AAAA-MM`). */
  sinValorar: string[];
}

/** Lo que mira el profe para ver si el alumno va bien o mal. */
export async function obtenerSeguimiento(
  valoraciones: ValoracionPort,
  dossier: Dossier,
  hoy: string,
): Promise<Seguimiento> {
  const [mensuales, final] = await Promise.all([
    valoraciones.listarMensuales(dossier.id),
    valoraciones.obtenerFinal(dossier.id),
  ]);
  return { mensuales, final, sinValorar: mesesSinValorar(dossier, mensuales, hoy) };
}
