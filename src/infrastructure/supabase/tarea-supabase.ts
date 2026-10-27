import type { SupabaseClient } from '@supabase/supabase-js';

import type { BorradorTarea, Tarea } from '@/core/domain/tarea';
import type { TareaPort } from '@/core/ports/tarea-port';

interface FilaTarea {
  id: string;
  dossier_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  completada: boolean;
  creada_por: string | null;
}

const COLUMNAS = 'id, dossier_id, titulo, descripcion, fecha_limite, completada, creada_por';

function aTarea(f: FilaTarea): Tarea {
  return {
    id: f.id,
    dossierId: f.dossier_id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    fechaLimite: f.fecha_limite,
    completada: f.completada,
    creadaPor: f.creada_por,
  };
}

// RLS y el trigger proteger_tarea deciden quién crea, marca o borra.
export class TareaSupabase implements TareaPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar(dossierId: string) {
    const { data, error } = await this.cliente
      .from('tareas')
      .select(COLUMNAS)
      .eq('dossier_id', dossierId)
      .returns<FilaTarea[]>();
    if (error) throw new Error(error.message);
    return data.map(aTarea);
  }

  async crear(b: BorradorTarea) {
    const { data: sesion } = await this.cliente.auth.getUser();
    const { data, error } = await this.cliente
      .from('tareas')
      .insert({
        dossier_id: b.dossierId,
        titulo: b.titulo,
        descripcion: b.descripcion,
        fecha_limite: b.fechaLimite,
        creada_por: sesion.user?.id ?? null,
      })
      .select(COLUMNAS)
      .single<FilaTarea>();
    if (error) throw new Error(error.message);
    return aTarea(data);
  }

  async marcar(id: string, completada: boolean) {
    const { data, error } = await this.cliente
      .from('tareas')
      .update({ completada })
      .eq('id', id)
      .select(COLUMNAS)
      .single<FilaTarea>();
    if (error) throw new Error(error.message);
    return aTarea(data);
  }

  async borrar(id: string) {
    const { error } = await this.cliente.from('tareas').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
