import { DatosInvalidosError } from './errores';

// El profe tutor avisa al alumno de que lleva días sin apuntar horas. Como mucho un toque al día
// por dossier, y se resuelve solo cuando el alumno apunta un día (lo hace la base de datos).

/** Lo que admite `dias_sin_apuntar` en la base: un año como muchísimo. */
export const MAX_DIAS_SIN_APUNTAR = 365;

export interface Toque {
  id: string;
  dossierId: string;
  /** Profe que lo dio. */
  dadoPor: string;
  /** Días laborables sin apuntar cuando se dio: solo para el texto del aviso. */
  diasSinApuntar: number;
  /** `AAAA-MM-DD`: el día en que se dio (Europe/Madrid). */
  fecha: string;
  creadoEn: string;
  /** Cuándo lo vio el alumno; `null` mientras no lo ha abierto. */
  vistoEn: string | null;
  /** Cuándo lo resolvió el alumno apuntando un día; `null` mientras sigue pendiente. */
  resueltoEn: string | null;
}

export function comprobarDiasSinApuntar(dias: number): void {
  if (!Number.isInteger(dias) || dias < 0 || dias > MAX_DIAS_SIN_APUNTAR) {
    throw new DatosInvalidosError(
      `Los días sin apuntar deben ser un número entero entre 0 y ${MAX_DIAS_SIN_APUNTAR}`,
    );
  }
}

/** Sigue esperando a que el alumno apunte un día. */
export function estaPendiente(toque: Pick<Toque, 'resueltoEn'>): boolean {
  return toque.resueltoEn === null;
}

/** Sigue pendiente y el alumno todavía no lo ha visto. */
export function sinVer(toque: Pick<Toque, 'resueltoEn' | 'vistoEn'>): boolean {
  return estaPendiente(toque) && toque.vistoEn === null;
}

function partes(fecha: string): [number, number, number] {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return [anio, mes, dia];
}

function siguienteDia(fecha: string): string {
  const [anio, mes, dia] = partes(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

/** De lunes a viernes. En UTC para no depender de la zona horaria del dispositivo. */
export function esLaborable(fecha: string): boolean {
  const [anio, mes, dia] = partes(fecha);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

/**
 * Días laborables entre `desde` y `hasta` (ambos incluidos) sin ningún día apuntado. Cuenta
 * cualquier día registrado, también ausencias y festivos, igual que el trigger `resolver_toques`.
 * Se corta en MAX_DIAS_SIN_APUNTAR porque la base no admite más.
 */
export function diasSinApuntar(
  apuntados: readonly { fecha: string }[],
  desde: string,
  hasta: string,
): number {
  const registrados = new Set(apuntados.map((a) => a.fecha));
  let total = 0;
  for (let fecha = desde; fecha <= hasta; fecha = siguienteDia(fecha)) {
    if (esLaborable(fecha) && !registrados.has(fecha)) total += 1;
    if (total >= MAX_DIAS_SIN_APUNTAR) return MAX_DIAS_SIN_APUNTAR;
  }
  return total;
}
