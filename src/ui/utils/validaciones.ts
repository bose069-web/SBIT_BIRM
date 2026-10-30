import type { Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { mesDe, mesesDelDossier, type ValoracionMensual } from '@/core/domain/valoracion';

import { limitesMes } from './fechas';

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

/** Identifica un informe en una selección. */
export function claveInforme({ dossier, mes }: InformePendiente): string {
  return `${dossier.id}|${mes}`;
}

/** Días trabajados y horas de un mes, a partir de todos los días del alumno. */
export function resumenMes(registros: RegistroDiario[], mes: string) {
  const [desde, hasta] = limitesMes(`${mes}-01`);
  const delMes = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
  return {
    dias: delMes.filter((r) => r.tipo === 'trabajo').length,
    horas: delMes.reduce((suma, r) => suma + totalHoras(r), 0),
  };
}

export interface ResumenBloque {
  alumnos: number;
  informes: number;
  horas: number;
  /** Informes sin ningún día de trabajo apuntado. */
  sinDias: number;
  /** Informes del mes en curso: al valorarlos, el alumno ya no podrá apuntar más días de ese mes. */
  delMesEnCurso: number;
}

/** Lo que se enseña antes de confirmar una valoración en bloque. */
export function resumirBloque(
  informes: InformePendiente[],
  registrosDe: (dossierId: string) => RegistroDiario[],
  hoy: string,
): ResumenBloque {
  const meses = informes.map((i) => resumenMes(registrosDe(i.dossier.id), i.mes));
  return {
    alumnos: new Set(informes.map((i) => i.dossier.id)).size,
    informes: informes.length,
    horas: meses.reduce((suma, m) => suma + m.horas, 0),
    sinDias: meses.filter((m) => m.dias === 0).length,
    delMesEnCurso: informes.filter((i) => i.mes === mesDe(hoy)).length,
  };
}
