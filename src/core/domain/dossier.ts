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
