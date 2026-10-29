import type { Dossier } from '@/core/domain/dossier';

import { fechaCorta } from './fechas';

// Chat de la empresa: un hilo por alumno en prácticas y otro por cada profe tutor que sigue a esos
// alumnos. Aquí va solo lo que se puede calcular sin pantalla ni backend.

/** Quién está al otro lado: un alumno en prácticas o su profe tutor del centro. */
export type RolChat = 'alumno' | 'profe';

export const TEXTO_ROL_CHAT: Record<RolChat, string> = {
  alumno: 'Alumno en prácticas',
  profe: 'Profe del centro',
};

export interface Conversacion {
  /** `alumno:<id del alumno>` o `profe:<id del profe>`. */
  id: string;
  titulo: string;
  /** Ciclo y centro del alumno, o los alumnos que sigue el profe. */
  etiqueta: string;
  rol: RolChat;
}

export interface MensajeChat {
  id: string;
  conversacionId: string;
  autorId: string;
  autorNombre: string;
  texto: string;
  /** Fecha y hora ISO. */
  enviadoEn: string;
}

/** Un hilo por alumno de la empresa y otro por cada profe que tutoriza a esos alumnos. */
export function conversacionesDe(dossiers: Dossier[], empresaId: string): Conversacion[] {
  const mios = [...dossiers]
    .filter((d) => d.tutorEmpresaId === empresaId)
    .sort((a, b) => a.alumnoNombre.localeCompare(b.alumnoNombre, 'es'));

  // Los profes pueden repetirse entre alumnos: se agrupan para nombrarlos en una sola etiqueta.
  const alumnosPorProfe = new Map<string, string[]>();
  for (const d of mios) {
    if (!d.tutorId) continue;
    const nombres = alumnosPorProfe.get(d.tutorId) ?? [];
    nombres.push(d.alumnoNombre);
    alumnosPorProfe.set(d.tutorId, nombres);
  }

  const conversaciones: Conversacion[] = [];
  const vistas = new Set<string>();
  for (const d of mios) {
    const id = `alumno:${d.alumnoId}`;
    if (vistas.has(id)) continue;
    vistas.add(id);
    conversaciones.push({
      id,
      titulo: d.alumnoNombre,
      etiqueta: [d.ciclo, d.centro].filter(Boolean).join(' · '),
      rol: 'alumno',
    });
  }
  for (const d of mios) {
    if (!d.tutorId || !d.tutorNombre) continue;
    const id = `profe:${d.tutorId}`;
    if (vistas.has(id)) continue;
    vistas.add(id);
    conversaciones.push({
      id,
      titulo: d.tutorNombre,
      etiqueta: `Profe de ${(alumnosPorProfe.get(d.tutorId) ?? []).join(', ')}`,
      rol: 'profe',
    });
  }
  return conversaciones;
}

/** Mensajes de un hilo, del más antiguo al más reciente. */
export function mensajesDe(mensajes: MensajeChat[], conversacionId: string): MensajeChat[] {
  return mensajes
    .filter((m) => m.conversacionId === conversacionId)
    .sort((a, b) => a.enviadoEn.localeCompare(b.enviadoEn));
}

/** El último mensaje de cada hilo, para enseñar el resumen en la bandeja. */
export function ultimosPorConversacion(mensajes: MensajeChat[]): Map<string, MensajeChat> {
  const ultimos = new Map<string, MensajeChat>();
  for (const m of mensajes) {
    const previo = ultimos.get(m.conversacionId);
    if (!previo || m.enviadoEn > previo.enviadoEn) ultimos.set(m.conversacionId, m);
  }
  return ultimos;
}

/** Los hilos con mensaje primero, del más reciente al más antiguo; los vacíos al final. */
export function porRecientes(
  conversaciones: Conversacion[],
  mensajes: MensajeChat[],
): Conversacion[] {
  const ultimos = ultimosPorConversacion(mensajes);
  const fecha = (c: Conversacion) => ultimos.get(c.id)?.enviadoEn ?? '';
  return [...conversaciones].sort((a, b) => {
    const fa = fecha(a);
    const fb = fecha(b);
    if (!fa && !fb) return a.titulo.localeCompare(b.titulo, 'es');
    if (!fa) return 1;
    if (!fb) return -1;
    return fb.localeCompare(fa);
  });
}

/** Lo que ha escrito otra persona desde la última vez que se abrió el hilo. */
export function noLeidos(
  mensajes: MensajeChat[],
  conversacionId: string,
  leidoHasta: string | null,
  usuarioId: string,
): number {
  return mensajes.filter(
    (m) =>
      m.conversacionId === conversacionId &&
      m.autorId !== usuarioId &&
      (leidoHasta === null || m.enviadoEn > leidoHasta),
  ).length;
}

/** Hora del mensaje en la burbuja: `14:05`. */
export function horaDe(iso: string): string {
  const fecha = new Date(iso);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** `hace 5 min`, `hace 3 h`, `ayer`, `hace 4 días` o la fecha a partir de una semana. */
export function hace(iso: string, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return fechaCorta(iso.slice(0, 10));
}
