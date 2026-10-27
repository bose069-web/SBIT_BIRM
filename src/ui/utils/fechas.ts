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

/** Primer y último día del mes de una fecha. */
export function limitesMes(fecha: string): [string, string] {
  const [a, m] = fecha.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return [`${a}-${mm}-01`, `${a}-${mm}-${ultimo}`];
}

export function formatoHoras(horas: number): string {
  return `${Number.isInteger(horas) ? horas : horas.toFixed(2).replace(/0$/, '')} h`;
}
