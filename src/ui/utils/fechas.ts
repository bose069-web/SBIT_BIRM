import { idiomaActual } from './idioma';

const MESES_ES = [
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

const MESES_CA = [
  'gener',
  'febrer',
  'març',
  'abril',
  'maig',
  'juny',
  'juliol',
  'agost',
  'setembre',
  'octubre',
  'novembre',
  'desembre',
];

const ABREVIADOS_CA = [
  'gen',
  'feb',
  'març',
  'abr',
  'maig',
  'juny',
  'jul',
  'ag',
  'set',
  'oct',
  'nov',
  'des',
];

/** Nombre del mes (1-12) en el idioma de la app. */
export function nombreDelMes(m: number): string {
  return (idiomaActual() === 'ca' ? MESES_CA : MESES_ES)[m - 1];
}

function mesAbreviado(m: number): string {
  return idiomaActual() === 'ca' ? ABREVIADOS_CA[m - 1] : MESES_ES[m - 1].slice(0, 3);
}

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
  return `${nombreDelMes(m)} ${a}`;
}

/** `2026-10-27` → `27 oct 2026` */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${d} ${mesAbreviado(m)} ${a}`;
}

/** Fecha y hora ISO → `14:05`, en la hora local. */
export function horaCorta(instante: string): string {
  const d = new Date(instante);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CA = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];

/** Nombre del día de la semana (0 = domingo) en el idioma de la app. */
export function nombreDelDia(dia: number): string {
  return (idiomaActual() === 'ca' ? DIAS_CA : DIAS_ES)[dia];
}

/** `2026-10-27` → `martes 27 de octubre` (`dimarts 27 d'octubre`). */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = nombreDelDia(new Date(a, m - 1, d).getDay());
  const mes = nombreDelMes(m);
  if (idiomaActual() === 'ca') return `${dia} ${d} ${/^[aeiou]/.test(mes) ? "d'" : 'de '}${mes}`;
  return `${dia} ${d} de ${mes}`;
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
