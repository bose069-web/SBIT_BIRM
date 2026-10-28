import type { BorradorEvento, Evento } from '@/core/domain/evento';
import type { EventoPort } from '@/core/ports/evento-port';

import { IDS_DEMO } from './datos-demo';

const EVENTOS_DEMO: Evento[] = [
  {
    id: 'evento-demo-1',
    dossierId: null,
    titulo: 'Todos los Santos',
    fecha: '2026-11-01',
    tipo: 'festivo',
  },
  {
    id: 'evento-demo-2',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Visita del profe a la empresa',
    fecha: '2026-11-12',
    tipo: 'reunion',
  },
  {
    id: 'evento-demo-3',
    dossierId: null,
    titulo: 'Inmaculada',
    fecha: '2026-12-08',
    tipo: 'festivo',
  },
];

export class EventoMemory implements EventoPort {
  private eventos = [...EVENTOS_DEMO];
  private siguienteId = 1;

  async listar(desde: string, hasta: string) {
    return this.eventos
      .filter((e) => e.fecha >= desde && e.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async crear(b: BorradorEvento) {
    const evento: Evento = { ...b, id: `evento-${this.siguienteId++}` };
    this.eventos.push(evento);
    return evento;
  }

  async borrar(id: string) {
    this.eventos = this.eventos.filter((e) => e.id !== id);
  }
}
