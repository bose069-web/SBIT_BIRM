import type { ThemeColor } from '@/ui/theme/theme';

/** Lo mínimo de cada alumno que hace falta para el resumen del profe. */
export interface AlumnoSeguido {
  nombre: string;
  porcentaje: number;
  /** Meses acabados que la empresa aún no ha valorado. */
  mesesSinValorar: number;
  tieneFinal: boolean;
}

export interface ResumenProfe {
  alumnos: number;
  /** Media del porcentaje de horas hechas (0-100, redondeada). */
  mediaPorcentaje: number;
  /** Alumnos con algún mes sin valorar por la empresa. */
  pendientesEmpresa: number;
  /** Alumnos que ya tienen la valoración final. */
  conFinal: number;
}

export function resumirSeguimiento(alumnos: AlumnoSeguido[]): ResumenProfe {
  const suma = alumnos.reduce((t, a) => t + a.porcentaje, 0);
  return {
    alumnos: alumnos.length,
    mediaPorcentaje: alumnos.length ? Math.round(suma / alumnos.length) : 0,
    pendientesEmpresa: alumnos.filter((a) => a.mesesSinValorar > 0).length,
    conFinal: alumnos.filter((a) => a.tieneFinal).length,
  };
}

/** Color de cada alumno: con final, validado; con meses sin valorar, pendiente; si no, normal. */
export function colorAlumno(a: AlumnoSeguido): ThemeColor {
  if (a.tieneFinal) return 'estadoValidado';
  if (a.mesesSinValorar > 0) return 'estadoPendiente';
  return 'primary';
}

/**
 * Barras de progreso por alumno para el gráfico: los que van más atrasados primero, como
 * mucho `maximo` para que quepan, con el nombre de pila como etiqueta.
 */
export function barrasProgreso(alumnos: AlumnoSeguido[], maximo = 8) {
  const usos = new Map<string, number>();
  for (const a of alumnos)
    usos.set(nombreCorto(a.nombre), (usos.get(nombreCorto(a.nombre)) ?? 0) + 1);
  return [...alumnos]
    .sort((a, b) => a.porcentaje - b.porcentaje || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, maximo)
    .map((a) => ({
      // Si dos se llaman igual de nombre de pila, se usa el nombre entero para distinguirlos.
      etiqueta:
        (usos.get(nombreCorto(a.nombre)) ?? 0) > 1 ? a.nombre.trim() : nombreCorto(a.nombre),
      valor: a.porcentaje,
      texto: `${a.porcentaje}%`,
      color: colorAlumno(a),
    }));
}

/** "Ana María López" → "Ana". */
export function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
