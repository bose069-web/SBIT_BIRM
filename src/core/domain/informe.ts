// Informes: solo lectura, sin entidad propia que guardar. El adaptador entrega los dossiers y los
// días que el usuario puede ver (la RLS ya filtra) y aquí se agregan en TypeScript puro, para que
// la pantalla no tenga que calcular nada.

/** Dossier reducido a lo que hace falta para agregar horas. */
export interface DossierParaInforme {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  /** Profe tutor del centro. */
  tutorId: string | null;
  tutorNombre: string | null;
  tutorEmpresaId: string | null;
  centroId: string;
  centro: string | null;
  empresaId: string;
  empresa: string | null;
  horasTotales: number;
}

/** Día registrado reducido a dossier, fecha y horas del día (sin las actividades). */
export interface DiaParaInforme {
  dossierId: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  horas: number;
}

export interface HorasPorMes {
  /** `AAAA-MM`. */
  mes: string;
  horas: number;
}

export interface ProgresoAlumno {
  dossierId: string;
  alumnoId: string;
  alumnoNombre: string;
  realizadas: number;
  totales: number;
  porcentaje: number;
}

/** Bloque de un informe: un profe, una empresa o un centro, con sus horas y sus alumnos. */
export interface GrupoInforme {
  id: string;
  nombre: string;
  horas: number;
  alumnos: number;
}

export interface InformeAlumno {
  alumnoNombre: string | null;
  realizadas: number;
  totales: number;
  porcentaje: number;
  porMes: HorasPorMes[];
}

interface Totales {
  realizadas: number;
  totales: number;
}

export interface InformeProfe extends Totales {
  alumnos: ProgresoAlumno[];
}

export interface InformeEmpresa extends Totales {
  alumnos: ProgresoAlumno[];
}

export interface InformeInstituto extends Totales {
  porProfe: GrupoInforme[];
  porEmpresa: GrupoInforme[];
}

export interface InformeGeneralitat extends Totales {
  porCentro: GrupoInforme[];
}

/** Los informes de las horas van en tramos de 15 minutos: sin decimales de más. */
export function redondearHoras(horas: number): number {
  return Math.round(horas * 100) / 100;
}

export function sumarHoras(dias: DiaParaInforme[]): number {
  return redondearHoras(dias.reduce((suma, d) => suma + d.horas, 0));
}

/** Nunca pasa del 100 %: se pueden registrar más horas de las previstas. */
export function porcentaje(realizadas: number, totales: number): number {
  if (totales <= 0) return 0;
  return Math.min(100, Math.round((realizadas / totales) * 100));
}

export function progresoDe(dossier: DossierParaInforme, dias: DiaParaInforme[]): ProgresoAlumno {
  const delDossier = dias.filter((d) => d.dossierId === dossier.id);
  const realizadas = sumarHoras(delDossier);
  return {
    dossierId: dossier.id,
    alumnoId: dossier.alumnoId,
    alumnoNombre: dossier.alumnoNombre,
    realizadas,
    totales: dossier.horasTotales,
    porcentaje: porcentaje(realizadas, dossier.horasTotales),
  };
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

/** Horas por mes, del más antiguo al más reciente. */
export function horasPorMes(dias: DiaParaInforme[]): HorasPorMes[] {
  const meses = new Map<string, number>();
  for (const dia of dias) {
    const mes = dia.fecha.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + dia.horas);
  }
  return [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, horas]) => ({ mes, horas: redondearHoras(horas) }));
}

/** Agrupa los dossiers por una clave (profe, empresa o centro) y suma sus horas. */
export function agrupar(
  dossiers: DossierParaInforme[],
  dias: DiaParaInforme[],
  clave: (d: DossierParaInforme) => { id: string; nombre: string } | null,
): GrupoInforme[] {
  const grupos = new Map<string, GrupoInforme>();
  for (const dossier of dossiers) {
    const grupo = clave(dossier);
    if (!grupo) continue;
    const horas = sumarHoras(dias.filter((d) => d.dossierId === dossier.id));
    const actual = grupos.get(grupo.id) ?? {
      id: grupo.id,
      nombre: grupo.nombre,
      horas: 0,
      alumnos: 0,
    };
    grupos.set(grupo.id, {
      ...actual,
      horas: redondearHoras(actual.horas + horas),
      alumnos: actual.alumnos + 1,
    });
  }
  return [...grupos.values()].sort(porNombre);
}
