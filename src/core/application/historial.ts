import type { Dossier } from '../domain/dossier';
import { HistorialNoDisponibleError, SinPermisoError } from '../domain/errores';
import type { EntradaHistorial } from '../domain/historial';
import { gestionaDossier, type Usuario } from '../domain/usuario';
import type { HistorialPort } from '../ports/historial-port';

const LIMITE_ENTRADAS = 50;

/** Lo ve quien ya puede ver el dossier. La base de datos (RLS) también lo impone. */
export function puedeVerHistorial(usuario: Usuario, dossier: Dossier): boolean {
  return (
    gestionaDossier(usuario, dossier) ||
    usuario.id === dossier.alumnoId ||
    usuario.id === dossier.tutorEmpresaId
  );
}

export type ConsultaHistorial =
  { disponible: true; entradas: EntradaHistorial[] } | { disponible: false };

/** El resto de errores (sin conexión…) se propagan: no es lo mismo que no tener historial. */
export async function consultarHistorial(
  historial: HistorialPort,
  usuario: Usuario,
  dossier: Dossier,
): Promise<ConsultaHistorial> {
  if (!puedeVerHistorial(usuario, dossier)) throw new SinPermisoError('ver este historial');
  try {
    return { disponible: true, entradas: await historial.listar(dossier.id, LIMITE_ENTRADAS) };
  } catch (error) {
    if (error instanceof HistorialNoDisponibleError) return { disponible: false };
    throw error;
  }
}
