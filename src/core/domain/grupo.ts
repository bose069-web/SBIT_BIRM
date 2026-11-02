import { DatosInvalidosError } from './errores';

// Clase (grupo) de un centro, p. ej. "DAM 2 A". El instituto del centro las crea y mete a sus
// alumnos; los profes y los alumnos solo ven la suya.

/** Los cursos que admite la base. */
export const MAX_CURSO = 4;
export const MAX_CICLO = 20;

export interface Grupo {
  id: string;
  centroId: string;
  /** Ciclo formativo, p. ej. `DAM`. */
  ciclo: string;
  /** De 1 a 4. */
  curso: number;
  /** Una sola letra, `A`–`Z`. */
  letra: string;
}

/** Lo que rellena el instituto. `id` null = clase nueva. */
export interface BorradorGrupo {
  id: string | null;
  centroId: string;
  ciclo: string;
  curso: number;
  letra: string;
}

export interface AlumnoEnClase {
  id: string;
  nombre: string;
  /** `null` mientras no está en ninguna clase. */
  grupoId: string | null;
}

/** `DAM 2 A`: como se nombra la clase en pantalla. */
export function nombreGrupo(grupo: Pick<Grupo, 'ciclo' | 'curso' | 'letra'>): string {
  return `${grupo.ciclo} ${grupo.curso} ${grupo.letra}`;
}

/** Quita espacios y pone la letra en mayúscula antes de comprobar nada. */
export function normalizarGrupo(borrador: BorradorGrupo): BorradorGrupo {
  return {
    ...borrador,
    ciclo: borrador.ciclo.trim(),
    letra: borrador.letra.trim().toUpperCase(),
  };
}

export function comprobarGrupo(borrador: BorradorGrupo): void {
  const { ciclo, curso, letra } = normalizarGrupo(borrador);
  if (!ciclo) throw new DatosInvalidosError('Indica el ciclo de la clase');
  if (ciclo.length > MAX_CICLO) {
    throw new DatosInvalidosError(`El ciclo no puede pasar de ${MAX_CICLO} caracteres`);
  }
  if (!Number.isInteger(curso) || curso < 1 || curso > MAX_CURSO) {
    throw new DatosInvalidosError(`El curso va de 1 a ${MAX_CURSO}`);
  }
  if (!/^[A-Z]$/.test(letra)) {
    throw new DatosInvalidosError('La clase se identifica con una sola letra');
  }
}

/** Por ciclo, curso y letra: el mismo orden en el que se leen en el centro. */
export function ordenarGrupos<T extends Pick<Grupo, 'ciclo' | 'curso' | 'letra'>>(
  grupos: T[],
): T[] {
  return [...grupos].sort(
    (a, b) =>
      a.ciclo.localeCompare(b.ciclo, 'es') || a.curso - b.curso || a.letra.localeCompare(b.letra),
  );
}
