import type { Dossier } from '@/core/domain/dossier';
import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';

import { esFinDeSemana, estadoDia } from './calendario';
import { sumarDias } from './fechas';

export interface Progreso {
  quedan: number;
  horasSemana: number;
  /** Laborables ya pasados (hasta hoy) sin nada apuntado, del más antiguo al más reciente. */
  sinApuntar: string[];
  /** Fecha en la que se acabarían las horas al ritmo actual, o `null` si aún no hay ritmo. */
  finEstimado: string | null;
  aTiempo: boolean;
}

/** Lo que el alumno necesita saber de un vistazo: lo que falta, la semana y si llega a tiempo. */
export function calcularProgreso(
  dossier: Dossier,
  registros: RegistroDiario[],
  hoy: string,
): Progreso {
  const porFecha = new Map(registros.map((r) => [r.fecha, r]));
  const realizadas = registros.reduce((s, r) => s + totalHoras(r), 0);
  const quedan = Math.max(0, dossier.horasTotales - realizadas);

  // Semana de lunes a domingo que contiene hoy.
  const [a, m, d] = hoy.split('-').map(Number);
  const lunes = sumarDias(hoy, -((new Date(a, m - 1, d).getDay() + 6) % 7));
  const domingo = sumarDias(lunes, 6);
  const horasSemana = registros
    .filter((r) => r.fecha >= lunes && r.fecha <= domingo)
    .reduce((s, r) => s + totalHoras(r), 0);

  const sinApuntar: string[] = [];
  const hasta = hoy < dossier.fechaFin ? hoy : dossier.fechaFin;
  for (let f = dossier.fechaInicio; f <= hasta; f = sumarDias(f, 1)) {
    if (estadoDia(f, porFecha.get(f), dossier, hoy) === 'pendiente') sinApuntar.push(f);
  }

  // Ritmo: media de horas por día trabajado, repartida en los laborables que vienen.
  const diasTrabajados = registros.filter((r) => totalHoras(r) > 0).length;
  let finEstimado: string | null = null;
  if (quedan === 0) finEstimado = hoy;
  else if (diasTrabajados > 0) {
    const media = realizadas / diasTrabajados;
    let falta = quedan;
    let f = hoy;
    while (falta > 0) {
      f = sumarDias(f, 1);
      if (!esFinDeSemana(f)) falta -= media;
    }
    finEstimado = f;
  }

  return {
    quedan,
    horasSemana,
    sinApuntar,
    finEstimado,
    aTiempo: finEstimado !== null && finEstimado <= dossier.fechaFin,
  };
}

export type NivelAviso = 'ninguno' | 'leve' | 'medio' | 'grave';

/** Cuanto más tiempo sin apuntar, más llamativo: 0, hasta 7, hasta 15 y más de 15 días. */
export function nivelSinApuntar(dias: number): NivelAviso {
  if (dias === 0) return 'ninguno';
  if (dias <= 7) return 'leve';
  if (dias <= 15) return 'medio';
  return 'grave';
}

/** Semana de prácticas en la que está hoy (1 = la del primer día) y cuántas tiene el periodo. */
export function semanaDePracticas(
  dossier: Pick<Dossier, 'fechaInicio' | 'fechaFin'>,
  hoy: string,
): { actual: number; total: number } {
  const dias = (desde: string, hasta: string) =>
    Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
  const total = Math.ceil((dias(dossier.fechaInicio, dossier.fechaFin) + 1) / 7);
  const actual = Math.floor(dias(dossier.fechaInicio, hoy) / 7) + 1;
  return { actual: Math.min(Math.max(actual, 1), total), total };
}

export interface HorasDeActividad {
  id: string;
  descripcion: string;
  horas: number;
}

/** Horas de un mes (`AAAA-MM`) repartidas por las actividades del dossier, en su orden. */
export function horasPorActividad(
  dossier: Pick<Dossier, 'actividades'>,
  registros: RegistroDiario[],
  mes: string,
): HorasDeActividad[] {
  const suma = new Map<string, number>();
  for (const r of registros) {
    if (!r.fecha.startsWith(mes)) continue;
    for (const h of r.horas) suma.set(h.actividadId, (suma.get(h.actividadId) ?? 0) + h.horas);
  }
  return [...dossier.actividades]
    .sort((a, b) => a.orden - b.orden)
    .map((a) => ({ id: a.id, descripcion: a.descripcion, horas: suma.get(a.id) ?? 0 }));
}

/** Los últimos días apuntados, del más reciente al más antiguo. */
export function ultimosRegistros(registros: RegistroDiario[], cuantos: number): RegistroDiario[] {
  return [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, cuantos);
}

export type PasoMes = 'hecho' | 'actual' | 'pendiente';

/**
 * Validación de un mes: el alumno apunta, la empresa lo valida al acabar y el profe lo confirma.
 * La confirmación del profe todavía no existe en la app: hasta entonces se queda pendiente.
 */
export function pasosDelMes(
  mes: string,
  mesesValidados: string[],
): { alumno: PasoMes; empresa: PasoMes; profe: PasoMes } {
  if (mesesValidados.includes(mes)) return { alumno: 'hecho', empresa: 'hecho', profe: 'actual' };
  return { alumno: 'actual', empresa: 'pendiente', profe: 'pendiente' };
}
