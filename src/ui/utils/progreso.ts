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
