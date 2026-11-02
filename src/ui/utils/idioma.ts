import { IDIOMAS, type Idioma } from '@/core/domain/perfil';

import { CATALAN } from './traducciones/ca';

/**
 * Idioma de la interfaz. Los textos se escriben en castellano en el código y `t()` los cambia por
 * su traducción al catalán si la hay; si falta alguna, se ve en castellano en vez de romperse.
 * El idioma vive aquí (y no solo en React) para que las funciones puras, como las de fechas,
 * también lo usen.
 */
let actual: Idioma = 'es';

export function idiomaActual(): Idioma {
  return actual;
}

export function fijarIdioma(idioma: Idioma): void {
  actual = idioma;
}

export type Variables = Record<string, string | number>;

/** `t("Datos: {origen}", { origen: "Supabase" })` → `Datos: Supabase` (`Dades: Supabase` en catalán). */
export function t(texto: string, variables?: Variables, idioma: Idioma = actual): string {
  const base = idioma === 'ca' ? (CATALAN[texto] ?? texto) : texto;
  if (!variables) return base;
  return base.replace(/\{(\w+)\}/g, (marca, nombre: string) =>
    nombre in variables ? String(variables[nombre]) : marca,
  );
}

/** Texto en singular o plural según la cantidad, ya traducido: `tPlural(n, '{n} día', '{n} días')`. */
export function tPlural(n: number, uno: string, varios: string, variables?: Variables): string {
  return t(n === 1 ? uno : varios, { n, ...variables });
}

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor);
}

/** Idioma del dispositivo o del navegador: catalán si lo tiene en catalán, si no castellano. */
export function idiomaDelDispositivo(): Idioma {
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return local.startsWith('ca') ? 'ca' : 'es';
  } catch {
    return 'es';
  }
}

/**
 * Traduce los trozos de texto fijo que llegan a un `ThemedText` (`<ThemedText>Tareas</ThemedText>`
 * o las partes fijas de `Hasta el {fecha}`), conservando los espacios de los extremos. Así no
 * hace falta envolver en `t()` cada texto sin variables; lo que no está en el diccionario
 * (nombres, fechas, cifras) se queda igual.
 */
export function traducirHijos<T>(hijos: T): T {
  if (actual === 'es') return hijos;
  if (typeof hijos === 'string') return traducirTrozo(hijos) as T;
  if (Array.isArray(hijos))
    return hijos.map((h) => (typeof h === 'string' ? traducirTrozo(h) : h)) as T;
  return hijos;
}

function traducirTrozo(trozo: string): string {
  const limpio = trozo.trim();
  if (!limpio || !(limpio in CATALAN)) return trozo;
  const inicio = trozo.slice(0, trozo.indexOf(limpio));
  const fin = trozo.slice(trozo.indexOf(limpio) + limpio.length);
  return inicio + CATALAN[limpio] + fin;
}
