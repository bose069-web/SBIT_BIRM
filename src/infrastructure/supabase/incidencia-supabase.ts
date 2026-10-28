import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  BorradorIncidencia,
  CambiosIncidencia,
  Incidencia,
  MensajeIncidencia,
} from '@/core/domain/incidencia';
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
  dossier: { tutor_id: string | null } | null;
}

interface FilaMensaje {
  id: string;
  incidencia_id: string;
  autor_id: string;
  texto: string;
  creado_en: string;
  autor: { nombre: string } | null;
}

const COLUMNAS_MENSAJE =
  'id, incidencia_id, autor_id, texto, creado_en, autor:perfiles!incidencia_mensajes_autor_id_fkey(nombre)';

const COLUMNAS =
  'id, centro_id, dossier_id, creada_por, titulo, descripcion, categoria, prioridad, estado, ' +
  'escalada, respuesta, atendida_por, creada_en, resuelta_en, ' +
  // Dos FK a perfiles: hay que decir cuál es la del autor.
  'autor:perfiles!incidencias_creada_por_fkey(nombre), dossier:dossiers(tutor_id)';

function aIncidencia(f: FilaIncidencia): Incidencia {
  return {
    id: f.id,
    centroId: f.centro_id,
    dossierId: f.dossier_id,
    tutorId: f.dossier?.tutor_id ?? null,
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

function aMensaje(f: FilaMensaje): MensajeIncidencia {
  return {
    id: f.id,
    incidenciaId: f.incidencia_id,
    autorId: f.autor_id,
    autorNombre: f.autor?.nombre ?? null,
    texto: f.texto,
    creadoEn: f.creado_en,
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

  async listarMensajes(incidenciaId: string) {
    const { data, error } = await this.cliente
      .from('incidencia_mensajes')
      .select(COLUMNAS_MENSAJE)
      .eq('incidencia_id', incidenciaId)
      .order('creado_en')
      .returns<FilaMensaje[]>();
    if (error) throw new Error(error.message);
    return data.map(aMensaje);
  }

  async enviarMensaje(incidenciaId: string, texto: string) {
    const { data, error } = await this.cliente
      .from('incidencia_mensajes')
      .insert({ incidencia_id: incidenciaId, texto })
      .select(COLUMNAS_MENSAJE)
      .single<FilaMensaje>();
    if (error) throw new Error(error.message);
    return aMensaje(data);
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
