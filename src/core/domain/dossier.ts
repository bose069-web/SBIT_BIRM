// Dossier: el acuerdo de prácticas (FCT/Dual) de un alumno con una empresa.
export interface ActividadFormativa {
  id: string;
  descripcion: string;
  orden: number;
}

export interface Dossier {
  id: string;
  alumnoId: string;
  tutorId: string | null;
  ciclo: string;
  empresa: string | null;
  centro: string | null;
  /** Fechas en formato ISO `AAAA-MM-DD`. */
  fechaInicio: string;
  fechaFin: string;
  horasTotales: number;
  actividades: ActividadFormativa[];
}

export function estaEnPeriodo(dossier: Dossier, fecha: string): boolean {
  return fecha >= dossier.fechaInicio && fecha <= dossier.fechaFin;
}
