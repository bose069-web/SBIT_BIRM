import type { SupabaseClient } from '@supabase/supabase-js';

import type { Dossier } from '@/core/domain/dossier';
import type { DossierPort } from '@/core/ports/dossier-port';

interface FilaDossier {
  id: string;
  alumno_id: string;
  tutor_id: string | null;
  tutor_empresa_id: string | null;
  ciclo: string;
  fecha_inicio: string;
  fecha_fin: string;
  horas_totales: number;
  alumno: { nombre: string } | null;
  tutor: { nombre: string } | null;
  tutor_empresa: { nombre: string } | null;
  empresas: { nombre: string } | null;
  centros: { nombre: string } | null;
  actividades_formativas: { id: string; descripcion: string; orden: number }[];
}

const COLUMNAS =
  'id, alumno_id, tutor_id, tutor_empresa_id, ciclo, fecha_inicio, fecha_fin, horas_totales, ' +
  'empresas(nombre), centros(nombre), actividades_formativas(id, descripcion, orden), ' +
  // Tres FK a perfiles: hay que decir cuál usa cada una.
  'alumno:perfiles!dossiers_alumno_id_fkey(nombre), tutor:perfiles!dossiers_tutor_id_fkey(nombre), ' +
  'tutor_empresa:perfiles!dossiers_tutor_empresa_id_fkey(nombre)';

function aDossier(f: FilaDossier): Dossier {
  return {
    id: f.id,
    alumnoId: f.alumno_id,
    // RLS puede ocultar un perfil: mejor un texto genérico que fallar.
    alumnoNombre: f.alumno?.nombre ?? 'Alumno',
    tutorId: f.tutor_id,
    tutorNombre: f.tutor?.nombre ?? null,
    tutorEmpresaId: f.tutor_empresa_id,
    tutorEmpresaNombre: f.tutor_empresa?.nombre ?? null,
    ciclo: f.ciclo,
    empresa: f.empresas?.nombre ?? null,
    centro: f.centros?.nombre ?? null,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    horasTotales: f.horas_totales,
    actividades: [...f.actividades_formativas].sort((a, b) => a.orden - b.orden),
  };
}

// RLS ya filtra: cada usuario solo recibe los dossiers que puede ver.
export class DossierSupabase implements DossierPort {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar() {
    const { data, error } = await this.cliente
      .from('dossiers')
      .select(COLUMNAS)
      .order('fecha_inicio', { ascending: false })
      .returns<FilaDossier[]>();
    if (error) throw new Error(error.message);
    return data.map(aDossier);
  }

  async obtener(id: string) {
    const { data, error } = await this.cliente
      .from('dossiers')
      .select(COLUMNAS)
      .eq('id', id)
      .maybeSingle<FilaDossier>();
    if (error) throw new Error(error.message);
    return data ? aDossier(data) : null;
  }
}
