import type { SupabaseClient } from '@supabase/supabase-js';

import type { BorradorRegistro, RegistroDiario } from '@/core/domain/registro-diario';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';

interface FilaRegistro {
  id: string;
  dossier_id: string;
  fecha: string;
  tipo: RegistroDiario['tipo'];
  observaciones: string | null;
  estado: RegistroDiario['estado'];
  comentario_tutor: string | null;
  horas_actividad: { actividad_id: string; horas: number | string }[];
}

const COLUMNAS =
  'id, dossier_id, fecha, tipo, observaciones, estado, comentario_tutor, horas_actividad(actividad_id, horas)';

function aRegistro(f: FilaRegistro): RegistroDiario {
  return {
    id: f.id,
    dossierId: f.dossier_id,
    fecha: f.fecha,
    tipo: f.tipo,
    observaciones: f.observaciones,
    estado: f.estado,
    comentarioTutor: f.comentario_tutor,
    // numeric de Postgres llega como texto.
    horas: f.horas_actividad.map((h) => ({ actividadId: h.actividad_id, horas: Number(h.horas) })),
  };
}

export class RegistroDiarioSupabase implements RegistroDiarioPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar(dossierId: string, desde: string, hasta: string) {
    const { data, error } = await this.cliente
      .from('registros_diarios')
      .select(COLUMNAS)
      .eq('dossier_id', dossierId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')
      .returns<FilaRegistro[]>();
    if (error) throw new Error(error.message);
    return data.map(aRegistro);
  }

  async obtenerPorFecha(dossierId: string, fecha: string) {
    const { data, error } = await this.cliente
      .from('registros_diarios')
      .select(COLUMNAS)
      .eq('dossier_id', dossierId)
      .eq('fecha', fecha)
      .maybeSingle<FilaRegistro>();
    if (error) throw new Error(error.message);
    return data ? aRegistro(data) : null;
  }

  private async obtener(id: string) {
    const { data, error } = await this.cliente
      .from('registros_diarios')
      .select(COLUMNAS)
      .eq('id', id)
      .single<FilaRegistro>();
    if (error) throw new Error(error.message);
    return aRegistro(data);
  }

  async guardar(b: BorradorRegistro) {
    const { data, error } = await this.cliente
      .from('registros_diarios')
      .upsert(
        {
          dossier_id: b.dossierId,
          fecha: b.fecha,
          tipo: b.tipo,
          observaciones: b.observaciones,
          estado: 'pendiente',
          comentario_tutor: null,
        },
        { onConflict: 'dossier_id,fecha' },
      )
      .select('id')
      .single<{ id: string }>();
    if (error) throw new Error(error.message);

    // Las horas se reemplazan enteras: más simple que calcular diferencias.
    const borrado = await this.cliente.from('horas_actividad').delete().eq('registro_id', data.id);
    if (borrado.error) throw new Error(borrado.error.message);
    if (b.horas.length > 0) {
      const { error: errorHoras } = await this.cliente.from('horas_actividad').insert(
        b.horas.map((h) => ({
          registro_id: data.id,
          actividad_id: h.actividadId,
          horas: h.horas,
        })),
      );
      if (errorHoras) throw new Error(errorHoras.message);
    }
    return this.obtener(data.id);
  }

  async eliminar(id: string) {
    const { error } = await this.cliente.from('registros_diarios').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async cambiarEstado(id: string, estado: 'validado' | 'rechazado', comentario: string | null) {
    const { data: sesion } = await this.cliente.auth.getUser();
    const { error } = await this.cliente
      .from('registros_diarios')
      .update({
        estado,
        comentario_tutor: comentario,
        validado_por: sesion.user?.id ?? null,
        validado_en: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return this.obtener(id);
  }
}
