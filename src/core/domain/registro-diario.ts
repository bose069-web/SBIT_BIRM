import type { ActividadFormativa, Dossier } from './dossier';
import { estaEnPeriodo } from './dossier';
import { RegistroInvalidoError } from './errores';

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
}

/**
 * Lo que envía el alumno al guardar un día. No se valida día a día:
 * la empresa valora el mes entero (ver valoracion.ts) y eso lo cierra.
 */
export type BorradorRegistro = Pick<
  RegistroDiario,
  'dossierId' | 'fecha' | 'tipo' | 'horas' | 'observaciones'
>;

export function totalHoras(registro: Pick<RegistroDiario, 'horas'>): number {
  return registro.horas.reduce((suma, h) => suma + h.horas, 0);
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
  totales: number;
  porcentaje: number;
}

export function resumirHoras(dossier: Dossier, registros: RegistroDiario[]): ResumenHoras {
  const realizadas = registros.reduce((suma, r) => suma + totalHoras(r), 0);
  return {
    realizadas,
    totales: dossier.horasTotales,
    porcentaje: Math.min(100, Math.round((realizadas / dossier.horasTotales) * 100)),
  };
}

/** Lo que el alumno está escribiendo en el formulario de un día. */
export interface ValoresDia {
  tipo: TipoDia;
  horas: HorasActividad[];
  observaciones: string;
}

export const VALORES_DIA_VACIOS: ValoresDia = { tipo: 'trabajo', horas: [], observaciones: '' };

export function valoresDeRegistro(registro: RegistroDiario | null): ValoresDia {
  if (!registro) return VALORES_DIA_VACIOS;
  return {
    tipo: registro.tipo,
    horas: registro.horas,
    observaciones: registro.observaciones ?? '',
  };
}

function formaComparable({ tipo, horas, observaciones }: ValoresDia) {
  return {
    tipo,
    observaciones: observaciones.trim(),
    horas: horas
      .filter((h) => h.horas > 0)
      .map((h) => [h.actividadId, h.horas] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  };
}

export function valoresDiaIguales(a: ValoresDia, b: ValoresDia): boolean {
  return JSON.stringify(formaComparable(a)) === JSON.stringify(formaComparable(b));
}

/** Identifica el contenido de una versión del servidor; `null` si no hay registro. */
export function huellaRegistro(registro: RegistroDiario | null): string | null {
  return registro && JSON.stringify(formaComparable(valoresDeRegistro(registro)));
}

/** Comprueba lo leído del dispositivo: puede estar corrupto o venir de otra versión. */
export function validarValoresDia(datos: unknown): ValoresDia | null {
  if (typeof datos !== 'object' || datos === null) return null;
  const { tipo, horas, observaciones } = datos as Record<string, unknown>;
  if (!TIPOS_DIA.includes(tipo as TipoDia)) return null;
  if (typeof observaciones !== 'string' || !Array.isArray(horas)) return null;
  const limpias: HorasActividad[] = [];
  for (const h of horas as unknown[]) {
    if (typeof h !== 'object' || h === null) return null;
    const { actividadId, horas: cantidad } = h as Record<string, unknown>;
    if (typeof actividadId !== 'string' || typeof cantidad !== 'number') return null;
    if (!Number.isFinite(cantidad) || cantidad < 0) return null;
    limpias.push({ actividadId, horas: cantidad });
  }
  return { tipo: tipo as TipoDia, horas: limpias, observaciones };
}

/** La jornada de trabajo más reciente antes de `fecha`, o `null` si no hay ninguna. */
export function ultimaJornadaAntesDe(
  registros: RegistroDiario[],
  fecha: string,
): RegistroDiario | null {
  return registros.reduce<RegistroDiario | null>(
    (ultima, r) =>
      r.tipo === 'trabajo' && r.fecha < fecha && (!ultima || r.fecha > ultima.fecha) ? r : ultima,
    null,
  );
}

/**
 * Horas que se pueden copiar de una jornada: solo las de actividades que siguen en el dossier y
 * sin pasar de MAX_HORAS_DIA. Ni id, ni fecha, ni observaciones: lo escrito describe aquel día.
 */
export function horasParaCopiar(
  jornada: Pick<RegistroDiario, 'horas'>,
  actividades: Pick<ActividadFormativa, 'id'>[],
): HorasActividad[] {
  const vigentes = new Set(actividades.map((a) => a.id));
  let disponibles = MAX_HORAS_DIA;
  const copiadas: HorasActividad[] = [];
  for (const { actividadId, horas } of jornada.horas) {
    if (!vigentes.has(actividadId)) continue;
    const cabe = Math.min(horas, disponibles);
    if (cabe > 0) copiadas.push({ actividadId, horas: cabe });
    disponibles -= cabe;
  }
  return copiadas;
}
