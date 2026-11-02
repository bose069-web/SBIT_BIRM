/** Lo que escribe el alumno en un campo de horas, ya interpretado. */
export type HorasLeidas =
  { tipo: 'vacio' } | { tipo: 'ok'; horas: number } | { tipo: 'error'; motivo: string };

/** Acepta coma o punto (`1,5` o `1.5`). Las horas van en tramos de 15 minutos. */
export function leerHoras(texto: string): HorasLeidas {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return { tipo: 'vacio' };
  const horas = Number(limpio);
  if (!Number.isFinite(horas) || !/^\d*\.?\d*$/.test(limpio)) {
    return { tipo: 'error', motivo: 'Escribe un número, p. ej. 1,5' };
  }
  if (horas <= 0) return { tipo: 'error', motivo: 'Tiene que ser más de 0' };
  if (horas * 4 !== Math.round(horas * 4)) {
    return { tipo: 'error', motivo: 'Usa tramos de 15 min: ,25 · ,5 · ,75' };
  }
  return { tipo: 'ok', horas };
}

/** Deja escribir solo cifras y una coma (el punto se pasa a coma). */
export function filtrarHoras(texto: string): string {
  const solo = texto.replace('.', ',').replace(/[^\d,]/g, '');
  const [entero, ...resto] = solo.split(',');
  return resto.length ? `${entero},${resto.join('').slice(0, 2)}` : entero;
}

/** Suma (o resta) `delta` horas sin bajar de 0 ni pasar de `maximo`, en tramos de 15 min. */
export function pasoHoras(actual: number, delta: number, maximo: number): number {
  const siguiente = Math.round((actual + delta) * 4) / 4;
  return Math.max(0, Math.min(maximo, siguiente));
}
