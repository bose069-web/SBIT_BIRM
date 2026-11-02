import type { SupabaseClient } from '@supabase/supabase-js';

import { HistorialNoDisponibleError } from '@/core/domain/errores';
import type { EntradaHistorial } from '@/core/domain/historial';
import { esRol } from '@/core/domain/usuario';
import type { HistorialPort } from '@/core/ports/historial-port';

interface Fila {
  id: number;
  dossier_id: string;
  entidad: EntradaHistorial['entidad'];
  accion: EntradaHistorial['accion'];
  actor_id: string | null;
  actor_rol: string | null;
  detalle: EntradaHistorial['detalle'];
  ocurrido_en: string;
}

/** Tabla inexistente, según lo responda Postgres o la caché de esquema de PostgREST. */
const TABLA_NO_EXISTE = new Set(['42P01', 'PGRST205']);

export class HistorialSupabase implements HistorialPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar(dossierId: string, limite: number) {
    const { data, error } = await this.cliente
      .from('historial_dossier')
      .select('id, dossier_id, entidad, accion, actor_id, actor_rol, detalle, ocurrido_en')
      .eq('dossier_id', dossierId)
      .order('ocurrido_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(limite)
      .returns<Fila[]>();
    if (error && TABLA_NO_EXISTE.has(error.code)) throw new HistorialNoDisponibleError();
    if (error) throw new Error(error.message);
    return data.map((f): EntradaHistorial => ({
      id: String(f.id),
      dossierId: f.dossier_id,
      entidad: f.entidad,
      accion: f.accion,
      actorId: f.actor_id,
      actorRol: esRol(f.actor_rol) ? f.actor_rol : null,
      detalle: f.detalle,
      ocurridoEn: f.ocurrido_en,
    }));
  }
}
