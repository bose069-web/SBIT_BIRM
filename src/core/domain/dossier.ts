import { DatosInvalidosError } from './errores';

// Dossier: el acuerdo de prácticas (FCT/Dual) de un alumno con una empresa.
// Es la relación "asigna" del modelo: alumno + profe tutor + empresa, siempre entre
// un centro y una empresa con convenio.
export interface ActividadFormativa {
  id: string;
  descripcion: string;
  orden: number;
}

export interface Dossier {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  /** Profe tutor del centro. */
  tutorId: string | null;
  tutorNombre: string | null;
  /** Tutor de la empresa: es quien valora cada mes. */
  tutorEmpresaId: string | null;
  tutorEmpresaNombre: string | null;
  ciclo: string;
  /** Centro del alumno y de su profe tutor. */
  centroId: string;
  centro: string | null;
  /** Empresa con convenio con el centro; su tutor de empresa trabaja en ella. */
  empresaId: string;
  empresa: string | null;
  /** Fechas en formato ISO `AAAA-MM-DD`. */
  fechaInicio: string;
  fechaFin: string;
  horasTotales: number;
  actividades: ActividadFormativa[];
}

export function estaEnPeriodo(dossier: Dossier, fecha: string): boolean {
  return fecha >= dossier.fechaInicio && fecha <= dossier.fechaFin;
}

/** Lo que rellena el formulario. `id` null = dossier nuevo; actividad con `id` null = nueva. */
export interface BorradorDossier {
  id: string | null;
  alumnoId: string;
  centroId: string;
  empresaId: string;
  tutorEmpresaId: string | null;
  ciclo: string;
  fechaInicio: string;
  fechaFin: string;
  horasTotales: number;
  actividades: { id: string | null; descripcion: string }[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function comprobarDossier(b: BorradorDossier): void {
  if (!b.alumnoId) throw new DatosInvalidosError('Elige el alumno');
  if (!b.empresaId) throw new DatosInvalidosError('Elige la empresa');
  if (!b.ciclo.trim()) throw new DatosInvalidosError('Indica el ciclo formativo');
  if (!FECHA.test(b.fechaInicio) || !FECHA.test(b.fechaFin)) {
    throw new DatosInvalidosError('Fechas no válidas');
  }
  if (b.fechaFin < b.fechaInicio) {
    throw new DatosInvalidosError('La fecha de fin no puede ser anterior a la de inicio');
  }
  if (!Number.isInteger(b.horasTotales) || b.horasTotales <= 0 || b.horasTotales > 2000) {
    throw new DatosInvalidosError('Las horas totales deben ser un número entero entre 1 y 2000');
  }
  if (b.actividades.length === 0) {
    throw new DatosInvalidosError('Añade al menos una actividad formativa');
  }
  const vistas = new Set<string>();
  for (const a of b.actividades) {
    const clave = a.descripcion.trim().toLowerCase();
    if (!clave) throw new DatosInvalidosError('Hay una actividad sin descripción');
    if (vistas.has(clave))
      throw new DatosInvalidosError(`Actividad repetida: ${a.descripcion.trim()}`);
    vistas.add(clave);
  }
}
