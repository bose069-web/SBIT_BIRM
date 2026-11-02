import type { Dossier } from '../domain/dossier';
import { esFalloDeRed, SinPermisoError } from '../domain/errores';
import type { Usuario } from '../domain/usuario';
import type { BorradorPort } from '../ports/borrador-port';
import type { DossierPort } from '../ports/dossier-port';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import type { ValoracionPort } from '../ports/valoracion-port';
import { guardarBorrador, leerBorrador } from './borradores';
import { obtenerDossierActual } from './dossier';
import { obtenerSeguimiento } from './valoracion';

/** Solo el contexto del formulario: sin contactos, notas, ni datos de otras personas. */
function minimo(d: Dossier): Dossier {
  return {
    ...d,
    alumnoNombre: '',
    tutorId: null,
    tutorNombre: null,
    tutorEmpresaId: null,
    tutorEmpresaNombre: null,
    centro: null,
    empresa: null,
  };
}

function validarContexto(valor: unknown): Dossier | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const d = valor as Record<string, unknown>;
  if (
    ![d.id, d.alumnoId, d.centroId, d.empresaId, d.ciclo, d.fechaInicio, d.fechaFin].every(
      (v) => typeof v === 'string',
    )
  )
    return null;
  if (
    typeof d.horasTotales !== 'number' ||
    !Number.isFinite(d.horasTotales) ||
    !Array.isArray(d.actividades)
  )
    return null;
  if (
    !d.actividades.every((a: unknown) => {
      if (typeof a !== 'object' || a === null) return false;
      const v = a as Record<string, unknown>;
      return (
        typeof v.id === 'string' && typeof v.descripcion === 'string' && typeof v.orden === 'number'
      );
    })
  )
    return null;
  return minimo(d as unknown as Dossier);
}

export async function cargarContextoRegistro(
  puertos: {
    dossiers: DossierPort;
    registros: RegistroDiarioPort;
    valoraciones: ValoracionPort;
    borradores: BorradorPort;
  },
  usuario: Usuario,
  desde: string,
  hasta: string,
  hoy: string,
) {
  const clave = { ambito: 'contexto-registro', usuarioId: usuario.id, contexto: [desde, hasta] };
  try {
    const dossier = await obtenerDossierActual(puertos.dossiers, hoy);
    if (!dossier) return null;
    if (dossier.alumnoId !== usuario.id) throw new SinPermisoError('abrir este registro');
    const [dias, seguimiento] = await Promise.all([
      puertos.registros.listar(dossier.id, desde, hasta),
      obtenerSeguimiento(puertos.valoraciones, dossier, hoy),
    ]);
    const contextoConservado = await guardarBorrador(puertos.borradores, clave, {
      valores: minimo(dossier),
      guardadoEn: new Date().toISOString(),
    }).then(
      () => true,
      () => false,
    );
    return { dossier, dias, seguimiento, local: false, contextoConservado };
  } catch (error) {
    if (!esFalloDeRed(error)) throw error;
    const copia = await leerBorrador(puertos.borradores, clave, validarContexto);
    if (!copia || copia.valores.alumnoId !== usuario.id) throw error;
    return {
      dossier: copia.valores,
      dias: [],
      seguimiento: { mensuales: [], final: null, sinValorar: [], sinConfirmar: [] },
      local: true,
      contextoConservado: true,
    };
  }
}
