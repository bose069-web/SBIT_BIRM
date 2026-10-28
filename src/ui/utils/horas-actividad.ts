import type { ActividadFormativa } from '@/core/domain/dossier';
import type { RegistroDiario } from '@/core/domain/registro-diario';

export interface HorasDeActividad {
  actividad: ActividadFormativa;
  horas: number;
  /** Parte de las horas registradas que es de esta actividad (0-100, redondeado). */
  porcentaje: number;
}

export interface ResumenDias {
  trabajo: number;
  ausencia: number;
  festivo: number;
}

/** Horas registradas en cada actividad del dossier, en el orden de las actividades. */
export function horasPorActividad(
  actividades: ActividadFormativa[],
  registros: Pick<RegistroDiario, 'horas'>[],
): HorasDeActividad[] {
  const suma = new Map<string, number>();
  for (const r of registros) {
    for (const h of r.horas) suma.set(h.actividadId, (suma.get(h.actividadId) ?? 0) + h.horas);
  }
  const total = [...suma.values()].reduce((a, b) => a + b, 0);
  return [...actividades]
    .sort((a, b) => a.orden - b.orden)
    .map((actividad) => {
      const horas = suma.get(actividad.id) ?? 0;
      return { actividad, horas, porcentaje: total ? Math.round((horas / total) * 100) : 0 };
    });
}

/** Cuántos días hay apuntados de cada tipo. */
export function contarDias(registros: Pick<RegistroDiario, 'tipo'>[]): ResumenDias {
  const r: ResumenDias = { trabajo: 0, ausencia: 0, festivo: 0 };
  for (const { tipo } of registros) r[tipo] += 1;
  return r;
}
