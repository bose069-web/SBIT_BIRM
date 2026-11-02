import { ToqueYaExisteError, SinPermisoError } from '@/core/domain/errores';
import type { Toque } from '@/core/domain/toque';
import type { ToquePort } from '@/core/ports/toque-port';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

interface FilaToque {
  id: string;
  dossier_id: string;
  dado_por: string;
  dias_sin_apuntar: number;
  fecha: string;
  creado_en: string;
  visto_en: string | null;
  resuelto_en: string | null;
}

const COLUMNAS =
  'id, dossier_id, dado_por, dias_sin_apuntar, fecha, creado_en, visto_en, resuelto_en';

function aToque(f: FilaToque): Toque {
  return {
    id: f.id,
    dossierId: f.dossier_id,
    dadoPor: f.dado_por,
    diasSinApuntar: f.dias_sin_apuntar,
    fecha: f.fecha,
    creadoEn: f.creado_en,
    vistoEn: f.visto_en,
    resueltoEn: f.resuelto_en,
  };
}

/** RLS (42501) y el único de un toque al día (23505), con el mensaje que ve el usuario. */
function traducir(error: PostgrestError, accion: string): never {
  if (error.code === '23505') throw new ToqueYaExisteError();
  if (error.code === '42501') throw new SinPermisoError(accion);
  // Los `raise exception` de los triggers ya vienen escritos para el usuario.
  throw new Error(error.message);
}

// RLS, `preparar_toque` y `proteger_toque` deciden quién da, marca y qué se puede cambiar.
export class ToqueSupabase implements ToquePort {
  constructor(private readonly cliente: SupabaseClient) {}

  async dar(dossierId: string, diasSinApuntar: number) {
    const { data, error } = await this.cliente
      .from('toques')
      .insert({ dossier_id: dossierId, dias_sin_apuntar: diasSinApuntar })
      .select(COLUMNAS)
      .single<FilaToque>();
    if (error) traducir(error, 'dar un toque a este alumno');
    return aToque(data);
  }

  async pendientesDelAlumno() {
    const { data, error } = await this.cliente
      .from('toques')
      .select(COLUMNAS)
      .is('resuelto_en', null)
      .order('creado_en', { ascending: false })
      .returns<FilaToque[]>();
    if (error) throw new Error(error.message);
    return data.map(aToque);
  }

  async ultimosPorDossier(dossierIds: string[]) {
    if (dossierIds.length === 0) return [];
    const { data, error } = await this.cliente
      .from('toques')
      .select(COLUMNAS)
      .in('dossier_id', dossierIds)
      .order('creado_en', { ascending: false })
      .returns<FilaToque[]>();
    if (error) throw new Error(error.message);
    const ultimos = new Map<string, Toque>();
    for (const fila of data) {
      if (!ultimos.has(fila.dossier_id)) ultimos.set(fila.dossier_id, aToque(fila));
    }
    return [...ultimos.values()];
  }

  async marcarVisto(id: string) {
    const { data, error } = await this.cliente
      .from('toques')
      .update({ visto_en: new Date().toISOString() })
      .eq('id', id)
      .select(COLUMNAS)
      .single<FilaToque>();
    if (error) traducir(error, 'marcar el toque como visto');
    return aToque(data);
  }
}
