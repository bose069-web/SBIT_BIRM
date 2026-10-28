import type { SupabaseClient } from '@supabase/supabase-js';

import type { BorradorIncidencia, CambiosIncidencia, Incidencia } from '@/core/domain/incidencia';
import type { IncidenciaPort } from '@/core/ports/incidencia-port';

interface FilaIncidencia {
  id: string;
  centro_id: string | null;
  dossier_id: string | null;
  creada_por: string;
  titulo: string;
  descripcion: string;
  categoria: Incidencia['categoria'];
  prioridad: Incidencia['prioridad'];
  estado: Incidencia['estado'];
  escalada: boolean;
  respuesta: string | null;
  atendida_por: string | null;
  creada_en: string;
  resuelta_en: string | null;
  autor: { nombre: string } | null;
}

const COLUMNAS =
  'id, centro_id, dossier_id, creada_por, titulo, descripcion, categoria, prioridad, estado, ' +
  'escalada, respuesta, atendida_por, creada_en, resuelta_en, ' +
  // Dos FK a perfiles: hay que decir cuál es la del autor.
  'autor:perfiles!incidencias_creada_por_fkey(nombre)';

function aIncidencia(f: FilaIncidencia): Incidencia {
  return {
    id: f.id,
    centroId: f.centro_id,
    dossierId: f.dossier_id,
    creadaPor: f.creada_por,
    creadaPorNombre: f.autor?.nombre ?? null,
    titulo: f.titulo,
    descripcion: f.descripcion,
    categoria: f.categoria,
    prioridad: f.prioridad,
    estado: f.estado,
    escalada: f.escalada,
    respuesta: f.respuesta,
    atendidaPor: f.atendida_por,
    creadaEn: f.creada_en,
    resueltaEn: f.resuelta_en,
  };
}

// RLS y los triggers preparar_incidencia y proteger_incidencia deciden quién ve y cambia qué.
export class IncidenciaSupabase implements IncidenciaPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar() {
    const { data, error } = await this.cliente
      .from('incidencias')
      .select(COLUMNAS)
      .order('creada_en', { ascending: false })
      .returns<FilaIncidencia[]>();
    if (error) throw new Error(error.message);
    return data.map(aIncidencia);
  }

  async abrir(b: BorradorIncidencia) {
    const { data, error } = await this.cliente
      .from('incidencias')
      .insert({
        dossier_id: b.dossierId,
        titulo: b.titulo,
        descripcion: b.descripcion,
        categoria: b.categoria,
      })
      .select(COLUMNAS)
      .single<FilaIncidencia>();
    if (error) throw new Error(error.message);
    return aIncidencia(data);
  }

  corregir(id: string, titulo: string, descripcion: string) {
    return this.actualizar(id, { titulo, descripcion });
  }

  atender(id: string, c: CambiosIncidencia) {
    const fila: Record<string, unknown> = {};
    if (c.estado !== undefined) fila.estado = c.estado;
    if (c.prioridad !== undefined) fila.prioridad = c.prioridad;
    if (c.respuesta !== undefined) fila.respuesta = c.respuesta;
    if (c.escalada !== undefined) fila.escalada = c.escalada;
    return this.actualizar(id, fila);
  }

  async borrar(id: string) {
    const { error } = await this.cliente.from('incidencias').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private async actualizar(id: string, fila: Record<string, unknown>) {
    const { data, error } = await this.cliente
      .from('incidencias')
      .update(fila)
      .eq('id', id)
      .select(COLUMNAS)
      .single<FilaIncidencia>();
    if (error) throw new Error(error.message);
    return aIncidencia(data);
  }
}
