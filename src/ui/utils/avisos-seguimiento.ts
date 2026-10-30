import type { ThemeColor } from '@/ui/theme/theme';

import { nombreMes } from './fechas';

// Lo que al instituto le conviene mirar de un vistazo en su panel: quién ha dejado de apuntar,
// qué meses sigue sin valorar la empresa, quién va por debajo de la mitad de sus horas y qué
// dossiers acabaron sin valoración final. Siempre en el mismo orden: de lo más urgente a lo menos.

export type TipoAvisoSeguimiento = 'sin-apuntar' | 'sin-valorar' | 'atrasado' | 'sin-final';

export interface AvisoSeguimiento {
  tipo: TipoAvisoSeguimiento;
  alumno: string;
  /** Motivo corto para la fila. */
  motivo: string;
  color: ThemeColor;
}

/** Lo mínimo que hace falta de un alumno para calcular sus avisos. */
export interface SeguimientoAlumno {
  alumno: string;
  /** Días laborables sin apuntar; 0 si está al día. */
  diasSinApuntar: number;
  /** Meses cerrados sin valorar, en `AAAA-MM`. */
  mesesSinValorar: string[];
  /** Porcentaje de horas hechas (0-100). */
  porcentaje: number;
  /** Las prácticas ya pasaron de su fecha de fin. */
  terminado: boolean;
  /** Ya tiene valoración final. */
  tieneFinal: boolean;
}

/** Por debajo de la mitad de las horas, el alumno va atrasado. */
export const UMBRAL_ATRASO = 50;

/** Nombre corto de cada aviso para la etiqueta de su chip. */
export const ETIQUETA_AVISO: Record<TipoAvisoSeguimiento, string> = {
  'sin-apuntar': 'Sin apuntar',
  'sin-valorar': 'Sin valorar',
  atrasado: 'Atrasado',
  'sin-final': 'Sin final',
};

const ORDEN: Record<TipoAvisoSeguimiento, number> = {
  'sin-apuntar': 0,
  'sin-valorar': 1,
  atrasado: 2,
  'sin-final': 3,
};

/** Dentro de cada tipo, el que más lejos está sale primero. */
function severidad(a: SeguimientoAlumno, tipo: TipoAvisoSeguimiento): number {
  if (tipo === 'sin-apuntar') return a.diasSinApuntar;
  if (tipo === 'sin-valorar') return a.mesesSinValorar.length;
  if (tipo === 'atrasado') return UMBRAL_ATRASO - a.porcentaje;
  return 0;
}

function etiqueta(
  a: SeguimientoAlumno,
  tipo: TipoAvisoSeguimiento,
): Omit<AvisoSeguimiento, 'alumno'> {
  if (tipo === 'sin-apuntar') {
    const plural = a.diasSinApuntar === 1 ? 'día laborable' : 'días laborables';
    return {
      tipo,
      motivo: `Lleva ${a.diasSinApuntar} ${plural} sin apuntar horas`,
      color: 'danger',
    };
  }
  if (tipo === 'sin-valorar') {
    const meses = a.mesesSinValorar.map(nombreMes).join(', ');
    return { tipo, motivo: `La empresa no ha valorado ${meses}`, color: 'estadoPendiente' };
  }
  if (tipo === 'atrasado') {
    return {
      tipo,
      motivo: `Solo lleva el ${a.porcentaje}% de sus horas`,
      color: 'estadoPendiente',
    };
  }
  return { tipo, motivo: 'Prácticas acabadas sin valoración final', color: 'estadoPendiente' };
}

/**
 * Avisos de todos los alumnos, del más urgente al menos: primero quien lleva días sin apuntar,
 * luego meses sin valorar, después el que va por debajo del umbral de horas y por último los
 * dossiers acabados sin valoración final. Un alumno con varios avisos aparece en cada uno.
 */
export function avisosSeguimiento(alumnos: SeguimientoAlumno[]): AvisoSeguimiento[] {
  const avisos: { aviso: AvisoSeguimiento; peso: number }[] = [];
  for (const a of alumnos) {
    const tipos: TipoAvisoSeguimiento[] = [];
    if (a.diasSinApuntar > 0) tipos.push('sin-apuntar');
    if (a.mesesSinValorar.length > 0) tipos.push('sin-valorar');
    if (!a.terminado && a.porcentaje < UMBRAL_ATRASO) tipos.push('atrasado');
    if (a.terminado && !a.tieneFinal) tipos.push('sin-final');
    for (const tipo of tipos) {
      avisos.push({
        aviso: { alumno: a.alumno, ...etiqueta(a, tipo) },
        peso: severidad(a, tipo),
      });
    }
  }
  return avisos
    .sort(
      (x, y) =>
        ORDEN[x.aviso.tipo] - ORDEN[y.aviso.tipo] ||
        y.peso - x.peso ||
        x.aviso.alumno.localeCompare(y.aviso.alumno, 'es'),
    )
    .map((x) => x.aviso);
}
