import type { Evento, TipoEvento } from '@/core/domain/evento';

import { sumarMeses } from './calendario';
import { nombreDelMes } from './fechas';

/** Una fecha del calendario de la red: las que pone la generalitat y los avisos automáticos. */
export interface FechaRed {
  id: string;
  fecha: string;
  titulo: string;
  tipo: TipoEvento;
  /** Recordatorio que genera la app (no se puede borrar ni editar). */
  automatico: boolean;
}

/**
 * Días del mes en que la empresa recibe el recordatorio de validar el mes anterior (ver
 * "Cuentas, datos y validación" en el vault: día 1 y día 5).
 */
export const DIAS_RECORDATORIO = [1, 5] as const;

/** `2026-11` → `octubre` (el mes que se valida en ese recordatorio). */
function mesAnterior(mes: string): string {
  return nombreDelMes(Number(sumarMeses(mes, -1).slice(5, 7)));
}

/** Recordatorios automáticos de validación de un mes `AAAA-MM`. */
export function recordatoriosDelMes(mes: string): FechaRed[] {
  const anterior = mesAnterior(mes);
  return DIAS_RECORDATORIO.map((dia, i) => ({
    id: `recordatorio-${mes}-${dia}`,
    fecha: `${mes}-${String(dia).padStart(2, '0')}`,
    titulo:
      i === 0
        ? `Las empresas validan ${anterior}`
        : `Segundo aviso a las empresas que no han validado ${anterior}`,
    tipo: 'plazo',
    automatico: true,
  }));
}

/**
 * Lo que ve la generalitat en un mes: solo las fechas generales (sin dossier) y los recordatorios
 * automáticos, por fecha. Nunca fechas de un alumno ni de un instituto concreto.
 */
export function fechasDeLaRed(eventos: Evento[], mes: string, tipos?: TipoEvento[]): FechaRed[] {
  const generales: FechaRed[] = eventos
    .filter((e) => e.dossierId === null && e.fecha.startsWith(mes))
    .map((e) => ({ id: e.id, fecha: e.fecha, titulo: e.titulo, tipo: e.tipo, automatico: false }));
  return [...generales, ...recordatoriosDelMes(mes)]
    .filter((f) => !tipos || tipos.includes(f.tipo))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(a.automatico) - Number(b.automatico));
}
