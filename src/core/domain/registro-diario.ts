import type { Dossier } from './dossier';
import { estaEnPeriodo } from './dossier';
import { RegistroInvalidoError } from './errores';

export const ESTADOS_REGISTRO = ['pendiente', 'validado', 'rechazado'] as const;
export type EstadoRegistro = (typeof ESTADOS_REGISTRO)[number];

export const TIPOS_DIA = ['trabajo', 'ausencia', 'festivo'] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];

export const MAX_HORAS_DIA = 12;

export interface HorasActividad {
  actividadId: string;
  horas: number;
}

export interface RegistroDiario {
  id: string;
  dossierId: string;
  /** `AAAA-MM-DD` */
  fecha: string;
  tipo: TipoDia;
  horas: HorasActividad[];
  observaciones: string | null;
  estado: EstadoRegistro;
  comentarioTutor: string | null;
}

/** Lo que envía el alumno al guardar un día; el estado y la validación los pone el sistema. */
export type BorradorRegistro = Pick<
  RegistroDiario,
  'dossierId' | 'fecha' | 'tipo' | 'horas' | 'observaciones'
>;

export function totalHoras(registro: Pick<RegistroDiario, 'horas'>): number {
  return registro.horas.reduce((suma, h) => suma + h.horas, 0);
}

export function esEditable(registro: RegistroDiario): boolean {
  return registro.estado !== 'validado';
}

/** Reglas de un día: dentro del periodo, actividades del dossier y horas coherentes con el tipo. */
export function comprobarBorrador(borrador: BorradorRegistro, dossier: Dossier): void {
  if (borrador.dossierId !== dossier.id)
    throw new RegistroInvalidoError('El día no pertenece a este dossier');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(borrador.fecha))
    throw new RegistroInvalidoError('Fecha no válida');
  if (!estaEnPeriodo(dossier, borrador.fecha)) {
    throw new RegistroInvalidoError('La fecha está fuera del periodo de prácticas');
  }

  if (borrador.tipo !== 'trabajo') {
    if (borrador.horas.length > 0) {
      throw new RegistroInvalidoError('Un día de ausencia o festivo no lleva horas');
    }
    return;
  }

  if (borrador.horas.length === 0)
    throw new RegistroInvalidoError('Indica las horas de al menos una actividad');
  const actividades = new Set(dossier.actividades.map((a) => a.id));
  const vistas = new Set<string>();
  for (const { actividadId, horas } of borrador.horas) {
    if (!actividades.has(actividadId))
      throw new RegistroInvalidoError('Actividad que no es de este dossier');
    if (vistas.has(actividadId))
      throw new RegistroInvalidoError('Actividad repetida en el mismo día');
    vistas.add(actividadId);
    if (!(horas > 0) || horas * 4 !== Math.round(horas * 4)) {
      throw new RegistroInvalidoError('Las horas van en tramos de 15 minutos y mayores que 0');
    }
  }
  if (totalHoras(borrador) > MAX_HORAS_DIA) {
    throw new RegistroInvalidoError(`Un día no puede superar ${MAX_HORAS_DIA} horas`);
  }
}

export interface ResumenHoras {
  realizadas: number;
  validadas: number;
  pendientes: number;
  totales: number;
  porcentajeValidado: number;
}

export function resumirHoras(dossier: Dossier, registros: RegistroDiario[]): ResumenHoras {
  let validadas = 0;
  let pendientes = 0;
  for (const r of registros) {
    if (r.estado === 'validado') validadas += totalHoras(r);
    else if (r.estado === 'pendiente') pendientes += totalHoras(r);
  }
  return {
    realizadas: validadas + pendientes,
    validadas,
    pendientes,
    totales: dossier.horasTotales,
    porcentajeValidado: Math.min(100, Math.round((validadas / dossier.horasTotales) * 100)),
  };
}
