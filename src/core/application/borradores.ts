import { interpretarBorrador, textoClaveBorrador } from '../domain/borrador';
import type { Borrador, ClaveBorrador } from '../domain/borrador';
import type { BorradorPort } from '../ports/borrador-port';

/** Lee un borrador. Si está corrupto se elimina y se trata como si no hubiera ninguno. */
export async function leerBorrador<T>(
  borradores: BorradorPort,
  clave: ClaveBorrador,
  validar: (valores: unknown) => T | null,
): Promise<Borrador<T> | null> {
  const texto = textoClaveBorrador(clave);
  const contenido = await borradores.leer(texto);
  if (contenido === null) return null;
  const borrador = interpretarBorrador(contenido, validar);
  if (!borrador) await borradores.borrar(texto).catch(() => undefined);
  return borrador;
}

export async function guardarBorrador<T>(
  borradores: BorradorPort,
  clave: ClaveBorrador,
  borrador: Borrador<T>,
): Promise<void> {
  await borradores.guardar(textoClaveBorrador(clave), JSON.stringify(borrador));
}

export async function descartarBorrador(
  borradores: BorradorPort,
  clave: ClaveBorrador,
): Promise<void> {
  await borradores.borrar(textoClaveBorrador(clave));
}
