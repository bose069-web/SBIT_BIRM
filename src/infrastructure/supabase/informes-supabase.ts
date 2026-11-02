import type { SupabaseClient } from '@supabase/supabase-js';

import type { DiaParaInforme, DossierParaInforme } from '@/core/domain/informe';
import type { InformePort } from '@/core/ports/informe-port';

interface FilaDossier {
  id: string;
  alumno_id: string;
  tutor_id: string | null;
  tutor_empresa_id: string | null;
  centro_id: string;
  empresa_id: string;
  horas_totales: number;
  alumno: { nombre: string } | null;
  tutor: { nombre: string } | null;
  empresas: { nombre: string } | null;
  centros: { nombre: string } | null;
}

interface FilaDia {
  dossier_id: string;
  fecha: string;
  horas_actividad: { horas: number | string }[];
}

const COLUMNAS =
  'id, alumno_id, tutor_id, tutor_empresa_id, centro_id, empresa_id, horas_totales, ' +
  'empresas(nombre), centros(nombre), ' +
  // Tres FK a perfiles: hay que decir cuál usa cada una.
  'alumno:perfiles!dossiers_alumno_id_fkey(nombre), tutor:perfiles!dossiers_tutor_id_fkey(nombre)';

// Solo lectura y sin agregar: la RLS decide qué dossiers y qué días llegan a cada usuario.
export class InformesSupabase implements InformePort {
  constructor(private readonly cliente: SupabaseClient) {}

  async obtenerDatos() {
    const [dossiers, dias] = await Promise.all([this.dossiers(), this.dias()]);
    return { dossiers, dias };
  }

  private async dossiers(): Promise<DossierParaInforme[]> {
    const { data, error } = await this.cliente
      .from('dossiers')
      .select(COLUMNAS)
      .order('fecha_inicio', { ascending: false })
      .returns<FilaDossier[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map((f) => ({
      id: f.id,
      alumnoId: f.alumno_id,
      // La RLS puede ocultar un perfil: mejor un texto genérico que fallar.
      alumnoNombre: f.alumno?.nombre ?? 'Alumno',
      tutorId: f.tutor_id,
      tutorNombre: f.tutor?.nombre ?? null,
      tutorEmpresaId: f.tutor_empresa_id,
      centroId: f.centro_id,
      centro: f.centros?.nombre ?? null,
      empresaId: f.empresa_id,
      empresa: f.empresas?.nombre ?? null,
      horasTotales: f.horas_totales,
    }));
  }

  private async dias(): Promise<DiaParaInforme[]> {
    const { data, error } = await this.cliente
      .from('registros_diarios')
      .select('dossier_id, fecha, horas_actividad(horas)')
      .order('fecha')
      .returns<FilaDia[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map((f) => ({
      dossierId: f.dossier_id,
      fecha: f.fecha,
      // numeric de Postgres llega como texto.
      horas: f.horas_actividad.reduce((suma, h) => suma + Number(h.horas), 0),
    }));
  }
}
