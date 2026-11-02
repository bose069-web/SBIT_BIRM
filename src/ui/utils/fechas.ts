const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Fecha local de hoy en `AAAA-MM-DD`. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const r = new Date(a, m - 1, d + dias);
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`;
}

/** `2026-10` → `octubre 2026` */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** `2026-10-27` → `27 oct 2026` */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${a}`;
}

/** Fecha y hora ISO → `14:05`, en la hora local. */
export function horaCorta(instante: string): string {
  const d = new Date(instante);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** `2026-10-27` → `martes 27 de octubre` */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = DIAS[new Date(a, m - 1, d).getDay()];
  return `${dia} ${d} de ${MESES[m - 1]}`;
}

/** Días que faltan de `hoy` a `fecha`; negativo si ya pasó y 0 si es hoy. */
export function diasHasta(fecha: string, hoy = hoyISO()): number {
  const [a1, m1, d1] = hoy.split('-').map(Number);
  const [a2, m2, d2] = fecha.split('-').map(Number);
  const desde = new Date(a1, m1 - 1, d1).getTime();
  const hasta = new Date(a2, m2 - 1, d2).getTime();
  return Math.round((hasta - desde) / 86_400_000);
}

/** Primer y último día del mes de una fecha. */
export function limitesMes(fecha: string): [string, string] {
  const [a, m] = fecha.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return [`${a}-${mm}-01`, `${a}-${mm}-${ultimo}`];
}

/** Horas con coma decimal, como se escriben en el formulario: `7,5 h`. */
export function formatoHoras(horas: number): string {
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(2).replace(/0$/, '');
  return `${texto.replace('.', ',')} h`;
}
