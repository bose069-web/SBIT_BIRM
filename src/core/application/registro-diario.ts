import type { DossierPort } from '../ports/dossier-port';
import type { Dossier } from '../domain/dossier';
import type { ClaveBorrador } from '../domain/borrador';
import {
  ConflictoRegistroError,
  esFalloDeRed,
  RegistroInvalidoError,
  SinPermisoError,
} from '../domain/errores';
import {
  comprobarBorrador,
  huellaRegistro,
  ultimaJornadaAntesDe,
  valoresDeRegistro,
  valoresDiaIguales,
  type BorradorRegistro,
  type RegistroDiario,
  type ValoresDia,
} from '../domain/registro-diario';
import type { Usuario } from '../domain/usuario';
import {
  mesCerrado,
  mesConfirmado,
  mesDe,
  type ValoracionFinal,
  type ValoracionMensual,
} from '../domain/valoracion';
import type { BorradorPort } from '../ports/borrador-port';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import type { ValoracionPort } from '../ports/valoracion-port';
import { descartarBorrador, guardarBorrador } from './borradores';

// La base de datos (RLS) también impide todo esto; aquí se comprueba antes para dar errores claros.

export function listarRegistros(
  registros: RegistroDiarioPort,
  dossierId: string,
  desde: string,
  hasta: string,
): Promise<RegistroDiario[]> {
  return registros.listar(dossierId, desde, hasta);
}

/** Última jornada de trabajo anterior a `fecha` en todo el periodo, aunque sea de otro mes. */
export async function buscarUltimaJornada(
  registros: RegistroDiarioPort,
  dossier: Pick<Dossier, 'id' | 'fechaInicio'>,
  fecha: string,
): Promise<RegistroDiario | null> {
  const dias = await registros.listar(dossier.id, dossier.fechaInicio, fecha);
  return ultimaJornadaAntesDe(dias, fecha);
}

async function comprobarMesAbierto(
  valoraciones: ValoracionPort,
  dossier: Dossier,
  fecha: string,
): Promise<void> {
  const [mensuales, final] = await Promise.all([
    valoraciones.listarMensuales(dossier.id),
    valoraciones.obtenerFinal(dossier.id),
  ]);
  if (mesCerrado(fecha, mensuales, final)) {
    throw new RegistroInvalidoError('Este mes ya está valorado y no se puede cambiar');
  }
}

export async function guardarRegistro(
  registros: RegistroDiarioPort,
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorRegistro,
): Promise<RegistroDiario> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('registrar días en este dossier');
  comprobarBorrador(borrador, dossier);
  await comprobarMesAbierto(valoraciones, dossier, borrador.fecha);
  return registros.guardar({ ...borrador, observaciones: borrador.observaciones?.trim() || null });
}

export type ResultadoEnvio =
  | { resultado: 'guardado'; registro: RegistroDiario }
  /** El servidor cambió desde que se empezó el borrador: no se ha tocado nada. */
  | { resultado: 'conflicto'; servidor: RegistroDiario | null }
  /** No se llegó al servidor: el borrador queda marcado como pendiente en el dispositivo. */
  | { resultado: 'sin-conexion'; guardadoEn: string }
  | { resultado: 'sin-guardar-local' };

/**
 * Envío explícito de un día. El borrador solo se borra si el servidor lo acepta; si se rechaza por
 * una regla (el mes se ha cerrado, por ejemplo) el error sube y el borrador se conserva.
 */
export async function enviarDia(
  puertos: {
    dossiers: DossierPort;
    registros: RegistroDiarioPort;
    valoraciones: ValoracionPort;
    borradores: BorradorPort;
  },
  usuario: Usuario,
  dossier: Dossier,
  clave: ClaveBorrador,
  envio: {
    fecha: string;
    valores: ValoresDia;
    /** Versión del servidor en la que se basó el formulario. */
    huellaBase: string | null;
    /** Fecha y hora ISO, para el borrador pendiente. */
    ahora: string;
  },
): Promise<ResultadoEnvio> {
  const { fecha, valores, huellaBase, ahora } = envio;
  const borrador: BorradorRegistro = {
    ...valores,
    dossierId: dossier.id,
    fecha,
  };
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('registrar días en este dossier');
  comprobarBorrador(borrador, dossier);

  try {
    const vigente = await puertos.dossiers.obtener(dossier.id);
    if (!vigente || vigente.alumnoId !== usuario.id)
      throw new SinPermisoError('registrar días en este dossier');
    comprobarBorrador(borrador, vigente);
    await comprobarMesAbierto(puertos.valoraciones, vigente, borrador.fecha);
    const servidor = await puertos.registros.obtenerPorFecha(dossier.id, borrador.fecha);
    const huellaServidor = huellaRegistro(servidor);
    // Si el servidor ya tiene justo esto (un reintento cuya respuesta se perdió), no hay conflicto.
    const yaIgual = servidor !== null && valoresDiaIguales(valoresDeRegistro(servidor), valores);
    if (!yaIgual && huellaServidor !== huellaBase) {
      return { resultado: 'conflicto', servidor };
    }
    const registro = await puertos.registros.guardar(
      {
        ...borrador,
        observaciones: borrador.observaciones?.trim() || null,
      },
      huellaBase,
    );
    await descartarBorrador(puertos.borradores, clave).catch(() => undefined);
    return { resultado: 'guardado', registro };
  } catch (e) {
    if (e instanceof ConflictoRegistroError)
      return { resultado: 'conflicto', servidor: e.servidor };
    if (!esFalloDeRed(e)) throw e;
    const conservado = await guardarBorrador(puertos.borradores, clave, {
      valores,
      guardadoEn: ahora,
      huellaBase,
      pendienteEnvio: true,
    }).then(
      () => true,
      () => false,
    );
    if (!conservado) return { resultado: 'sin-guardar-local' };
    return { resultado: 'sin-conexion', guardadoEn: ahora };
  }
}

export async function eliminarRegistro(
  registros: RegistroDiarioPort,
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
): Promise<void> {
  if (usuario.id !== dossier.alumnoId) throw new SinPermisoError('borrar días de este dossier');
  await comprobarMesAbierto(valoraciones, dossier, registro.fecha);
  await registros.eliminar(registro.id);
}

/** Solo el profe tutor del dossier corrige las horas de su alumno. */
export function puedeCorregirHoras(usuario: Usuario, dossier: Pick<Dossier, 'tutorId'>): boolean {
  return usuario.rol === 'profe' && usuario.id === dossier.tutorId;
}

/** Un mes confirmado, o con valoración final, no se corrige sin quitar antes la confirmación. */
export function mesBloqueadoParaTutor(
  fecha: string,
  mensuales: Pick<ValoracionMensual, 'mes' | 'confirmadaEn'>[],
  final: ValoracionFinal | null,
): boolean {
  return final !== null || mesConfirmado(mensuales, mesDe(fecha));
}

async function comprobarCorreccion(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  fecha: string,
): Promise<void> {
  if (!puedeCorregirHoras(usuario, dossier)) throw new SinPermisoError('corregir estas horas');
  const [mensuales, final] = await Promise.all([
    valoraciones.listarMensuales(dossier.id),
    valoraciones.obtenerFinal(dossier.id),
  ]);
  if (mesBloqueadoParaTutor(fecha, mensuales, final)) {
    throw new RegistroInvalidoError(
      final
        ? 'El alumno ya tiene valoración final: no se pueden corregir sus horas'
        : 'Este mes ya está confirmado: quita antes la confirmación',
    );
  }
}

/**
 * El tutor crea o corrige un día. Lanza `ConflictoRegistroError` si el día ha cambiado desde que lo
 * abrió, para no pisar lo que acaba de apuntar el alumno.
 */
export async function corregirDia(
  puertos: { registros: RegistroDiarioPort; valoraciones: ValoracionPort },
  usuario: Usuario,
  dossier: Dossier,
  fecha: string,
  valores: ValoresDia,
  huellaBase: string | null,
): Promise<RegistroDiario> {
  const borrador: BorradorRegistro = { ...valores, dossierId: dossier.id, fecha };
  comprobarBorrador(borrador, dossier);
  await comprobarCorreccion(puertos.valoraciones, usuario, dossier, fecha);
  return puertos.registros.guardar(
    { ...borrador, observaciones: valores.observaciones.trim() || null },
    huellaBase,
  );
}

export async function borrarDiaComoTutor(
  puertos: { registros: RegistroDiarioPort; valoraciones: ValoracionPort },
  usuario: Usuario,
  dossier: Dossier,
  registro: RegistroDiario,
): Promise<void> {
  await comprobarCorreccion(puertos.valoraciones, usuario, dossier, registro.fecha);
  await puertos.registros.eliminar(registro.id);
}
