import type { Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import { mesDe, mesesDelDossier, type ValoracionMensual } from '@/core/domain/valoracion';

// Lo que mira el tutor de empresa para saber qué le falta por validar y qué ya ha validado.
// Es lógica de pantalla (no de negocio): la comparten el Inicio y la pestaña Validaciones, para
// que las dos cuenten exactamente lo mismo.

/** Un dossier con sus valoraciones: lo que basta para saber si va al día. */
export interface CargaSeguimiento {
  dossier: Dossier;
  seguimiento: Seguimiento;
}

export interface InformePendiente {
  dossier: Dossier;
  /** `AAAA-MM` que la empresa puede validar y sigue sin valorar. */
  mes: string;
}

export interface ValoracionConAlumno {
  dossier: Dossier;
  valoracion: ValoracionMensual;
}

/**
 * Meses que la empresa ya puede valorar (los empezados, también el mes en curso) y siguen sin
 * valorar. Ojo: el profe solo cuenta los meses ya acabados (ver `mesesSinValorar` en el núcleo).
 */
export function mesesPorValidar(
  dossier: Pick<Dossier, 'fechaInicio' | 'fechaFin'>,
  seguimiento: Pick<Seguimiento, 'mensuales' | 'final'>,
  hoy: string,
): string[] {
  // La valoración final del profe cierra el dossier: la empresa ya no puede validar meses.
  if (seguimiento.final) return [];
  const valorados = new Set(seguimiento.mensuales.map((v) => v.mes));
  return mesesDelDossier(dossier).filter((m) => m <= mesDe(hoy) && !valorados.has(m));
}

/** Pendientes de todos los alumnos, de lo más reciente a lo más antiguo. */
export function informesPorValidar(cargas: CargaSeguimiento[], hoy: string): InformePendiente[] {
  return cargas
    .flatMap(({ dossier, seguimiento }) =>
      mesesPorValidar(dossier, seguimiento, hoy).map((mes) => ({ dossier, mes })),
    )
    .sort(
      (a, b) =>
        b.mes.localeCompare(a.mes) ||
        a.dossier.alumnoNombre.localeCompare(b.dossier.alumnoNombre, 'es'),
    );
}

/** Todas las valoraciones mensuales hechas, la última arriba. */
export function valoracionesConAlumno(cargas: CargaSeguimiento[]): ValoracionConAlumno[] {
  return cargas
    .flatMap(({ dossier, seguimiento }) =>
      seguimiento.mensuales.map((valoracion) => ({ dossier, valoracion })),
    )
    .sort((a, b) => b.valoracion.valoradaEn.localeCompare(a.valoracion.valoradaEn));
}
