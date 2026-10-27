import type { Dossier } from '../domain/dossier';
import { SinPermisoError } from '../domain/errores';
import { comprobarEvento, type BorradorEvento, type Evento } from '../domain/evento';
import type { Tarea } from '../domain/tarea';
import { gestionaDossier, type Usuario } from '../domain/usuario';
import type { EventoPort } from '../ports/evento-port';

/** Primer y último día (`AAAA-MM-DD`) de un mes `AAAA-MM`. */
export function limitesMes(mes: string): { desde: string; hasta: string } {
  const [anio, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

export function listarEventosMes(eventos: EventoPort, mes: string): Promise<Evento[]> {
  const { desde, hasta } = limitesMes(mes);
  return eventos.listar(desde, hasta);
}

/** Qué hay cada día del mes: eventos y fechas límite de tareas, por fecha `AAAA-MM-DD`. */
export function agendaDelMes(
  mes: string,
  eventos: Evento[],
  tareas: Pick<Tarea, 'id' | 'titulo' | 'fechaLimite' | 'completada'>[] = [],
): Map<string, { eventos: Evento[]; tareas: typeof tareas }> {
  const agenda = new Map<string, { eventos: Evento[]; tareas: typeof tareas }>();
  const dia = (fecha: string) => {
    let d = agenda.get(fecha);
    if (!d) agenda.set(fecha, (d = { eventos: [], tareas: [] }));
    return d;
  };
  for (const e of eventos) if (e.fecha.startsWith(mes)) dia(e.fecha).eventos.push(e);
  for (const t of tareas) if (t.fechaLimite?.startsWith(mes)) dia(t.fechaLimite).tareas.push(t);
  return agenda;
}

/**
 * Eventos de un dossier: quien lo gestiona. Eventos generales: instituto y generalitat.
 * `dossier` es obligatorio si el borrador es de un dossier.
 */
export function crearEvento(
  eventos: EventoPort,
  usuario: Usuario,
  borrador: BorradorEvento,
  dossier?: Dossier,
): Promise<Evento> {
  const limpio = { ...borrador, titulo: borrador.titulo.trim() };
  comprobarEvento(limpio);
  const puede =
    limpio.dossierId === null
      ? usuario.rol === 'instituto' || usuario.rol === 'generalitat'
      : dossier?.id === limpio.dossierId && gestionaDossier(usuario, dossier);
  if (!puede) throw new SinPermisoError('crear este evento');
  return eventos.crear(limpio);
}
