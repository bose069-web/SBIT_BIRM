import type { RegistroDiario } from '@/core/domain/registro-diario';

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Semanas de un mes (`AAAA-MM`) de lunes a domingo; los huecos de otros meses son `null`. */
export function semanasDelMes(mes: string): (string | null)[][] {
  const [a, m] = mes.split('-').map(Number);
  const diasDelMes = new Date(a, m, 0).getDate();
  // getDay(): 0 = domingo. Lo pasamos a 0 = lunes.
  const hueco = (new Date(a, m - 1, 1).getDay() + 6) % 7;
  const celdas: (string | null)[] = Array(hueco).fill(null);
  for (let d = 1; d <= diasDelMes; d++) {
    celdas.push(`${mes}-${String(d).padStart(2, '0')}`);
  }
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/** `2026-10` → `2026-11` (o `2026-09` con -1). */
export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const r = new Date(a, m - 1 + n, 1);
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}`;
}

export function esFinDeSemana(fecha: string): boolean {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia === 0 || dia === 6;
}

export type EstadoDia =
  | 'fuera' // fuera del periodo de prácticas
  | 'trabajo'
  | 'ausencia'
  | 'festivo'
  | 'pendiente' // laborable ya pasado (u hoy) sin apuntar
  | 'futuro' // todavía no ha llegado
  | 'libre'; // fin de semana sin apuntar

export function estadoDia(
  fecha: string,
  registro: Pick<RegistroDiario, 'tipo'> | undefined,
  periodo: { fechaInicio: string; fechaFin: string },
  hoy: string,
): EstadoDia {
  if (fecha < periodo.fechaInicio || fecha > periodo.fechaFin) return 'fuera';
  if (registro) return registro.tipo;
  if (fecha > hoy) return 'futuro';
  return esFinDeSemana(fecha) ? 'libre' : 'pendiente';
}
