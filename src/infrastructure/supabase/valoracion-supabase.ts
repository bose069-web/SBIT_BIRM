import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SinPermisoError,
  ValoracionInvalidaError,
  ValoracionYaExisteError,
} from '@/core/domain/errores';
import type {
  BorradorValoracionFinal,
  BorradorValoracionMensual,
  ValoracionFinal,
  ValoracionMensual,
} from '@/core/domain/valoracion';
import type { ValoracionPort } from '@/core/ports/valoracion-port';

interface FilaMensual {
  id: string;
  dossier_id: string;
  /** `AAAA-MM-01` */
  mes: string;
  valoracion: ValoracionMensual['valoracion'];
  comentario: string | null;
  valorada_por: string;
  valorada_en: string;
  confirmada_por: string | null;
  confirmada_en: string | null;
}

interface FilaFinal {
  dossier_id: string;
  resultado: ValoracionFinal['resultado'];
  comentario: string | null;
  valorada_por: string;
  valorada_en: string;
}

const COLUMNAS_MENSUAL =
  'id, dossier_id, mes, valoracion, comentario, valorada_por, valorada_en, confirmada_por, confirmada_en';
const COLUMNAS_FINAL = 'dossier_id, resultado, comentario, valorada_por, valorada_en';

function aMensual(f: FilaMensual): ValoracionMensual {
  return {
    id: f.id,
    dossierId: f.dossier_id,
    // En la base de datos el mes es una fecha (día 1); en el dominio, `AAAA-MM`.
    mes: f.mes.slice(0, 7),
    valoracion: f.valoracion,
    comentario: f.comentario,
    valoradaPor: f.valorada_por,
    valoradaEn: f.valorada_en,
    confirmadaPor: f.confirmada_por,
    confirmadaEn: f.confirmada_en,
  };
}

function aFinal(f: FilaFinal): ValoracionFinal {
  return {
    dossierId: f.dossier_id,
    resultado: f.resultado,
    comentario: f.comentario,
    valoradaPor: f.valorada_por,
    valoradaEn: f.valorada_en,
  };
}

// RLS decide quién puede valorar; aquí solo se guarda quién lo hace (debe ser el usuario con sesión).
export class ValoracionSupabase implements ValoracionPort {
  constructor(private readonly cliente: SupabaseClient) {}

  private async quienValora(): Promise<string> {
    const { data, error } = await this.cliente.auth.getUser();
    if (error || !data.user) throw new Error('No hay sesión iniciada');
    return data.user.id;
  }

  async listarMensuales(dossierId: string) {
    const { data, error } = await this.cliente
      .from('valoraciones_mensuales')
      .select(COLUMNAS_MENSUAL)
      .eq('dossier_id', dossierId)
      .order('mes')
      .returns<FilaMensual[]>();
    if (error) throw new Error(error.message);
    return data.map(aMensual);
  }

  async guardarMensual(b: BorradorValoracionMensual) {
    const { data, error } = await this.cliente
      .from('valoraciones_mensuales')
      .upsert(
        {
          dossier_id: b.dossierId,
          mes: `${b.mes}-01`,
          valoracion: b.valoracion,
          comentario: b.comentario,
          valorada_por: await this.quienValora(),
          valorada_en: new Date().toISOString(),
        },
        { onConflict: 'dossier_id,mes' },
      )
      .select(COLUMNAS_MENSUAL)
      .single<FilaMensual>();
    if (error) throw new Error(error.message);
    return aMensual(data);
  }

  async crearMensual(b: BorradorValoracionMensual) {
    // Insert y no upsert: la restricción única (dossier, mes) impide pisar otra valoración, también
    // si alguien la ha guardado después de cargar la pantalla.
    const { data, error } = await this.cliente
      .from('valoraciones_mensuales')
      .insert({
        dossier_id: b.dossierId,
        mes: `${b.mes}-01`,
        valoracion: b.valoracion,
        comentario: b.comentario,
        valorada_por: await this.quienValora(),
        valorada_en: new Date().toISOString(),
      })
      .select(COLUMNAS_MENSUAL)
      .single<FilaMensual>();
    if (error?.code === '23505') throw new ValoracionYaExisteError();
    if (error?.code === '42501') throw new SinPermisoError('valorar este dossier');
    if (error) throw new Error(error.message);
    return aMensual(data);
  }

  async confirmarMes(dossierId: string, mes: string) {
    return this.cambiarConfirmacion(dossierId, mes, true);
  }

  async quitarConfirmacion(dossierId: string, mes: string) {
    return this.cambiarConfirmacion(dossierId, mes, false);
  }

  /**
   * Solo se manda `confirmada_en`: el trigger `confirmar_mes` pone quién confirma, comprueba que sea
   * el profe tutor y le impide a la empresa tocar un mes ya confirmado.
   */
  private async cambiarConfirmacion(dossierId: string, mes: string, confirmar: boolean) {
    const { data, error } = await this.cliente
      .from('valoraciones_mensuales')
      .update({ confirmada_en: confirmar ? new Date().toISOString() : null })
      .eq('dossier_id', dossierId)
      .eq('mes', `${mes}-01`)
      .select(COLUMNAS_MENSUAL)
      .single<FilaMensual>();
    if (error?.code === '42501') throw new SinPermisoError('confirmar este mes');
    // `raise exception` del trigger: el mensaje ya está en castellano y se le puede enseñar al usuario.
    if (error?.code === 'P0001') throw new ValoracionInvalidaError(error.message);
    if (error) throw new Error(error.message);
    return aMensual(data);
  }

  async obtenerFinal(dossierId: string) {
    const { data, error } = await this.cliente
      .from('valoraciones_finales')
      .select(COLUMNAS_FINAL)
      .eq('dossier_id', dossierId)
      .maybeSingle<FilaFinal>();
    if (error) throw new Error(error.message);
    return data ? aFinal(data) : null;
  }

  async guardarFinal(b: BorradorValoracionFinal) {
    const { data, error } = await this.cliente
      .from('valoraciones_finales')
      .upsert(
        {
          dossier_id: b.dossierId,
          resultado: b.resultado,
          comentario: b.comentario,
          valorada_por: await this.quienValora(),
          valorada_en: new Date().toISOString(),
        },
        { onConflict: 'dossier_id' },
      )
      .select(COLUMNAS_FINAL)
      .single<FilaFinal>();
    if (error) throw new Error(error.message);
    return aFinal(data);
  }
}
