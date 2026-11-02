import type { Dossier } from '@/core/domain/dossier';

import { diasHasta, fechaCorta, formatoHoras } from './fechas';

// El tutor de empresa no necesita saber "159 de 400 h": necesita saber si ese alumno va al ritmo
// del calendario y si hay algo que hacer con él. Aquí va esa cuenta, con el mismo periodo que usa
// la app para el resto (fechas del dossier).

/** Días sin apuntar un día de trabajo a partir de los cuales se avisa. */
export const DIAS_SIN_APUNTAR = 5;
/** Días que faltan para acabar las prácticas a partir de los cuales se avisa. */
export const DIAS_AVISO_FIN = 15;
/** Cuánto puede ir por detrás (fracción de las horas totales) antes de avisar. */
const MARGEN_RITMO = 0.1;

export type EstadoRitmo = 'sin_empezar' | 'terminadas' | 'al_dia' | 'por_debajo';

export interface Ritmo {
  realizadas: number;
  totales: number;
  /** Horas que debería llevar a día de hoy si va al ritmo del calendario. */
  esperadas: number;
  /** Realizadas menos esperadas: si es negativo, va por detrás. */
  desviacion: number;
  porcentaje: number;
  porcentajeEsperado: number;
  estado: EstadoRitmo;
  /** Días que faltan para que acaben las prácticas (negativo si ya acabaron). */
  diasRestantes: number;
}

type Periodo = Pick<Dossier, 'fechaInicio' | 'fechaFin' | 'horasTotales'>;

const porcentajeDe = (horas: number, totales: number) =>
  totales > 0 ? Math.min(100, Math.round((horas / totales) * 100)) : 0;

/** Compara las horas hechas con las que tocarían por calendario. */
export function calcularRitmo(dossier: Periodo, realizadas: number, hoy: string): Ritmo {
  const diasTotales = Math.max(1, diasHasta(dossier.fechaFin, dossier.fechaInicio) + 1);
  const diasRestantes = diasHasta(dossier.fechaFin, hoy);
  const base = {
    realizadas,
    totales: dossier.horasTotales,
    porcentaje: porcentajeDe(realizadas, dossier.horasTotales),
    diasRestantes,
  };

  // Antes de empezar no hay ritmo que comparar.
  if (hoy < dossier.fechaInicio) {
    return {
      ...base,
      esperadas: 0,
      desviacion: realizadas,
      porcentajeEsperado: 0,
      estado: 'sin_empezar',
    };
  }

  // Una vez acabadas, el ritmo que cuenta es el total de horas del dossier.
  const corte = hoy > dossier.fechaFin ? dossier.fechaFin : hoy;
  const transcurridos = diasHasta(corte, dossier.fechaInicio) + 1;
  const esperadas =
    hoy > dossier.fechaFin
      ? dossier.horasTotales
      : Math.round((dossier.horasTotales * transcurridos) / diasTotales);
  const desviacion = realizadas - esperadas;

  let estado: EstadoRitmo = 'al_dia';
  if (hoy > dossier.fechaFin) estado = 'terminadas';
  else if (desviacion < -dossier.horasTotales * MARGEN_RITMO) estado = 'por_debajo';

  return {
    ...base,
    esperadas,
    desviacion,
    porcentajeEsperado: porcentajeDe(esperadas, dossier.horasTotales),
    estado,
  };
}

/**
 * Lo que hay que mirar de un alumno, en el orden en que se actúa: primero si ha dejado de
 * apuntar, luego si va por detrás del calendario y por último si le quedan pocos días.
 */
export function avisosAlumno(
  dossier: Periodo,
  realizadas: number,
  ultimoDia: string | null,
  hoy: string,
): string[] {
  const ritmo = calcularRitmo(dossier, realizadas, hoy);
  const avisos: string[] = [];

  // Solo se avisa de que no apunta mientras las prácticas están en marcha.
  if (hoy >= dossier.fechaInicio && hoy <= dossier.fechaFin) {
    if (!ultimoDia) {
      if (diasHasta(hoy, dossier.fechaInicio) >= DIAS_SIN_APUNTAR) {
        avisos.push('No ha apuntado ningún día todavía');
      }
    } else if (diasHasta(hoy, ultimoDia) > DIAS_SIN_APUNTAR) {
      avisos.push(`Sin apuntar desde el ${fechaCorta(ultimoDia)}`);
    }
  }

  if (ritmo.estado === 'por_debajo') {
    avisos.push(`Va ${formatoHoras(-ritmo.desviacion)} por debajo del ritmo`);
  }

  if (ritmo.diasRestantes >= 0 && ritmo.diasRestantes <= DIAS_AVISO_FIN) {
    avisos.push(
      ritmo.diasRestantes === 0
        ? 'Las prácticas terminan hoy'
        : `Le quedan ${ritmo.diasRestantes} días de prácticas`,
    );
  }

  return avisos;
}
