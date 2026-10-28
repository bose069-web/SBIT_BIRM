import { sumarDias } from '@/ui/utils/fechas';

/** A partir de cuántos días laborables sin apuntar se avisa al profe. */
export const DIAS_PARA_AVISAR = 3;

const esLaborable = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia !== 0 && dia !== 6;
};

/**
 * Días laborables (lunes a viernes) que han pasado desde `desde` sin contarlo, hasta `hoy`
 * sin contarlo tampoco: si apuntó ayer, hoy lleva 0 días sin apuntar.
 */
export function laborablesEntre(desde: string, hoy: string): number {
  let n = 0;
  for (let f = sumarDias(desde, 1); f < hoy; f = sumarDias(f, 1)) if (esLaborable(f)) n += 1;
  return n;
}

export interface AlumnoConRegistros {
  dossierId: string;
  nombre: string;
  /** `AAAA-MM-DD` del inicio y fin de las prácticas. */
  fechaInicio: string;
  fechaFin: string;
  /** Fechas que ha apuntado (en cualquier orden). */
  fechas: string[];
}

export interface AlumnoSinApuntar {
  dossierId: string;
  nombre: string;
  dias: number;
  /** Último día apuntado, o null si aún no ha apuntado ninguno. */
  ultimo: string | null;
}

/**
 * Alumnos con las prácticas en marcha que llevan `minimo` días laborables o más sin apuntar
 * horas, del que más lleva al que menos. Se cuenta desde el último día apuntado o, si no hay
 * ninguno, desde la víspera del inicio de las prácticas.
 */
export function alumnosSinApuntar(
  alumnos: AlumnoConRegistros[],
  hoy: string,
  minimo = DIAS_PARA_AVISAR,
): AlumnoSinApuntar[] {
  return alumnos
    .filter((a) => a.fechaInicio <= hoy && a.fechaFin >= hoy)
    .map((a) => {
      const pasadas = a.fechas.filter((f) => f <= hoy).sort();
      const ultimo = pasadas.at(-1) ?? null;
      const desde = ultimo ?? sumarDias(a.fechaInicio, -1);
      return {
        dossierId: a.dossierId,
        nombre: a.nombre,
        ultimo,
        dias: laborablesEntre(desde, hoy),
      };
    })
    .filter((a) => a.dias >= minimo)
    .sort((a, b) => b.dias - a.dias || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Texto de la tarea que se le encarga al alumno al darle un toque. */
export function textoToque(a: AlumnoSinApuntar): { titulo: string; descripcion: string } {
  return {
    titulo: 'Apunta tus horas de prácticas',
    descripcion:
      `Llevas ${a.dias} ${a.dias === 1 ? 'día laborable' : 'días laborables'} sin registrar horas. ` +
      'Ponte al día en Registro y avísame si tienes algún problema.',
  };
}
