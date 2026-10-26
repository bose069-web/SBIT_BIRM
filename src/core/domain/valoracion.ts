import type { Dossier } from './dossier';
import { ValoracionInvalidaError } from './errores';

// Como en el SBIT: el tutor de empresa valora cada mes y el profe pone la valoración final.

export const VALORACIONES_MES = ['positiva', 'mejorable', 'negativa'] as const;
export type ValoracionMes = (typeof VALORACIONES_MES)[number];

export const RESULTADOS_FINALES = ['apto', 'no_apto'] as const;
export type ResultadoFinal = (typeof RESULTADOS_FINALES)[number];

export interface ValoracionMensual {
  id: string;
  dossierId: string;
  /** `AAAA-MM` */
  mes: string;
  valoracion: ValoracionMes;
  comentario: string | null;
  valoradaPor: string;
  /** Fecha y hora ISO. */
  valoradaEn: string;
}

/** Lo que envía la empresa; quién valora y cuándo lo pone el sistema. */
export type BorradorValoracionMensual = Pick<
  ValoracionMensual,
  'dossierId' | 'mes' | 'valoracion' | 'comentario'
>;

export interface ValoracionFinal {
  dossierId: string;
  resultado: ResultadoFinal;
  comentario: string | null;
  valoradaPor: string;
  valoradaEn: string;
}

export type BorradorValoracionFinal = Pick<
  ValoracionFinal,
  'dossierId' | 'resultado' | 'comentario'
>;

/** Mes `AAAA-MM` de una fecha `AAAA-MM-DD`. */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/** Todos los meses del periodo de prácticas, en orden (`AAAA-MM`). */
export function mesesDelDossier(dossier: Pick<Dossier, 'fechaInicio' | 'fechaFin'>): string[] {
  const meses: string[] = [];
  let [anio, mes] = mesDe(dossier.fechaInicio).split('-').map(Number);
  const fin = mesDe(dossier.fechaFin);
  for (;;) {
    const actual = `${anio}-${String(mes).padStart(2, '0')}`;
    if (actual > fin) return meses;
    meses.push(actual);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
}

/**
 * Un día ya no lo puede cambiar el alumno cuando la empresa ha valorado su mes
 * o el profe ha puesto la valoración final.
 */
export function mesCerrado(
  fecha: string,
  mensuales: Pick<ValoracionMensual, 'mes'>[],
  final: ValoracionFinal | null,
): boolean {
  return final !== null || mensuales.some((v) => v.mes === mesDe(fecha));
}

/** Meses ya acabados (o el actual) que la empresa todavía no ha valorado. */
export function mesesSinValorar(
  dossier: Pick<Dossier, 'fechaInicio' | 'fechaFin'>,
  mensuales: Pick<ValoracionMensual, 'mes'>[],
  hoy: string,
): string[] {
  const valorados = new Set(mensuales.map((v) => v.mes));
  return mesesDelDossier(dossier).filter((m) => m < mesDe(hoy) && !valorados.has(m));
}

export function comprobarValoracionMensual(
  borrador: BorradorValoracionMensual,
  dossier: Dossier,
  hoy: string,
): void {
  if (borrador.dossierId !== dossier.id)
    throw new ValoracionInvalidaError('La valoración no es de este dossier');
  if (!/^\d{4}-\d{2}$/.test(borrador.mes)) throw new ValoracionInvalidaError('Mes no válido');
  if (!mesesDelDossier(dossier).includes(borrador.mes)) {
    throw new ValoracionInvalidaError('El mes está fuera del periodo de prácticas');
  }
  if (borrador.mes > mesDe(hoy)) {
    throw new ValoracionInvalidaError('No se puede valorar un mes que aún no ha empezado');
  }
  if (borrador.valoracion !== 'positiva' && !borrador.comentario?.trim()) {
    throw new ValoracionInvalidaError('Explica qué tiene que mejorar el alumno');
  }
}

export function comprobarValoracionFinal(
  borrador: BorradorValoracionFinal,
  dossier: Dossier,
): void {
  if (borrador.dossierId !== dossier.id)
    throw new ValoracionInvalidaError('La valoración no es de este dossier');
  if (borrador.resultado === 'no_apto' && !borrador.comentario?.trim()) {
    throw new ValoracionInvalidaError('Explica por qué el alumno no es apto');
  }
}
