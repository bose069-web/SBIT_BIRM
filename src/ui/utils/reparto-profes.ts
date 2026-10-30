// El instituto no piensa en alumnos sueltos: piensa en profes. Este reparto agrupa a las
// personas del centro por su profe, siempre en el mismo orden: los profes por orden
// alfabético y, al final, lo que todavía no tiene profe asignado.

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

export interface SeccionProfe<T> {
  /** null = lo que aún no tiene profe asignado. */
  profe: { id: string; nombre: string } | null;
  alumnos: T[];
}

/**
 * Un profesor por sección, con sus alumnos dentro; los profes sin alumnos salen igual (lista
 * vacía) para que se les pueda mostrar. Al final, la sección «sin profe» si queda algo.
 */
export function profesConAlumnos<T extends { nombre: string; profeId: string | null }>(
  profes: { id: string; nombre: string }[],
  alumnos: T[],
): SeccionProfe<T>[] {
  const conProfe: SeccionProfe<T>[] = [];
  const porId = new Map<string, SeccionProfe<T>>();
  for (const p of [...profes].sort(porNombre)) {
    const seccion: SeccionProfe<T> = { profe: { id: p.id, nombre: p.nombre }, alumnos: [] };
    conProfe.push(seccion);
    porId.set(p.id, seccion);
  }
  const sinProfe: T[] = [];
  for (const a of alumnos) {
    const seccion = a.profeId ? porId.get(a.profeId) : undefined;
    if (seccion) seccion.alumnos.push(a);
    else sinProfe.push(a);
  }
  for (const s of conProfe) s.alumnos.sort(porNombre);
  return sinProfe.length > 0
    ? [...conProfe, { profe: null, alumnos: sinProfe.sort(porNombre) }]
    : conProfe;
}
