import { ConflictoRegistroError } from '@/core/domain/errores';
import { huellaRegistro } from '@/core/domain/registro-diario';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { BorradorRegistro, RegistroDiario } from '@/core/domain/registro-diario';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';

interface FilaRegistro {
  id: string;
  dossier_id: string;
  fecha: string;
  tipo: RegistroDiario['tipo'];
  observaciones: string | null;
  horas_actividad: { actividad_id: string; horas: number | string }[];
}

const COLUMNAS = 'id, dossier_id, fecha, tipo, observaciones, horas_actividad(actividad_id, horas)';

function aRegistro(f: FilaRegistro): RegistroDiario {
  return {
    id: f.id,
    dossierId: f.dossier_id,
    fecha: f.fecha,
    tipo: f.tipo,
    observaciones: f.observaciones,
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

  async guardar(b: BorradorRegistro, huellaEsperada?: string | null): Promise<RegistroDiario> {
    const base =
      huellaEsperada === undefined
        ? huellaRegistro(await this.obtenerPorFecha(b.dossierId, b.fecha))
        : huellaEsperada;
    const { data, error } = await this.cliente.rpc('guardar_registro_atomico', {
      p_dossier: b.dossierId,
      p_fecha: b.fecha,
      p_tipo: b.tipo,
      p_observaciones: b.observaciones,
      p_horas: b.horas,
      p_base: base === null ? null : (JSON.parse(base) as unknown),
    });
    const respuesta = data as unknown as
      | { resultado: 'guardado'; registro: FilaRegistro }
      | { resultado: 'conflicto'; servidor: FilaRegistro | null }
      | null;
    if (error) throw new Error(error.message);
    if (!respuesta) throw new Error('El servidor no confirmó el guardado');
    if (respuesta.resultado === 'conflicto')
      throw new ConflictoRegistroError(respuesta.servidor ? aRegistro(respuesta.servidor) : null);
    return aRegistro(respuesta.registro);
  }

  async eliminar(id: string) {
    const { error } = await this.cliente.from('registros_diarios').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
