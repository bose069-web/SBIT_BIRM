import type { SupabaseClient } from '@supabase/supabase-js';

import {
  TIPOS_EVENTO,
  type BorradorEvento,
  type Evento,
  type TipoEvento,
} from '@/core/domain/evento';
import type { EventoPort } from '@/core/ports/evento-port';

interface FilaEvento {
  id: string;
  dossier_id: string | null;
  titulo: string;
  fecha: string;
  tipo: string;
}

const COLUMNAS = 'id, dossier_id, titulo, fecha, tipo';

function aEvento(f: FilaEvento): Evento {
  // La columna es texto libre: lo desconocido se muestra como evento normal.
  const tipo = (TIPOS_EVENTO as readonly string[]).includes(f.tipo)
    ? (f.tipo as TipoEvento)
    : 'evento';
  return { id: f.id, dossierId: f.dossier_id, titulo: f.titulo, fecha: f.fecha, tipo };
}

// RLS ya filtra: generales para todos y los de los dossiers que el usuario puede ver.
export class EventoSupabase implements EventoPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar(desde: string, hasta: string) {
    const { data, error } = await this.cliente
      .from('eventos')
      .select(COLUMNAS)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')
      .returns<FilaEvento[]>();
    if (error) throw new Error(error.message);
    return data.map(aEvento);
  }

  async crear(b: BorradorEvento) {
    const { data, error } = await this.cliente
      .from('eventos')
      .insert({ dossier_id: b.dossierId, titulo: b.titulo, fecha: b.fecha, tipo: b.tipo })
      .select(COLUMNAS)
      .single<FilaEvento>();
    if (error) throw new Error(error.message);
    return aEvento(data);
  }

  async borrar(id: string) {
    const { error } = await this.cliente.from('eventos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
