/** Lo que escribe el usuario en un campo de fecha, ya interpretado. */
export type FechaLeida =
  { tipo: 'vacia' } | { tipo: 'ok'; fecha: string } | { tipo: 'error'; motivo: string };

/**
 * Acepta `AAAA-MM-DD` y también `DD/MM/AAAA` (o con guiones), que es como se escribe
 * normalmente. Devuelve siempre `AAAA-MM-DD` y comprueba que el día exista.
 */
export function leerFecha(texto: string): FechaLeida {
  const limpio = texto.trim();
  if (!limpio) return { tipo: 'vacia' };
  let a: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(limpio);
  const es = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(limpio);
  if (iso) [a, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (es) [d, m, a] = [Number(es[1]), Number(es[2]), Number(es[3])];
  else return { tipo: 'error', motivo: 'Escribe la fecha como 31/10/2026' };
  const fecha = new Date(a, m - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) {
    return { tipo: 'error', motivo: 'Ese día no existe' };
  }
  return {
    tipo: 'ok',
    fecha: `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}
