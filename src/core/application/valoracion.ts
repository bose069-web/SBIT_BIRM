import type { Dossier } from '../domain/dossier';
import {
  esFalloDeRed,
  SinPermisoError,
  ValoracionInvalidaError,
  ValoracionYaExisteError,
} from '../domain/errores';
import { gestionaDossier, type Usuario } from '../domain/usuario';
import {
  comprobarConfirmacion,
  comprobarValoracionFinal,
  comprobarValoracionMensual,
  mesesSinConfirmar,
  mesesSinValorar,
  type BorradorValoracionFinal,
  type BorradorValoracionMensual,
  type ValoracionFinal,
  type ValoracionMensual,
} from '../domain/valoracion';
import type { ValoracionPort } from '../ports/valoracion-port';

// La base de datos (RLS) también impide todo esto; aquí se comprueba antes para dar errores claros.

function puedeValorarMes(usuario: Usuario, dossier: Dossier): boolean {
  return (
    gestionaDossier(usuario, dossier) ||
    (usuario.rol === 'empresa' && usuario.id === dossier.tutorEmpresaId)
  );
}

/** Las reglas de valorar un mes, sean uno o muchos. */
async function comprobarQuePuedeValorar(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorValoracionMensual,
  hoy: string,
): Promise<void> {
  if (!puedeValorarMes(usuario, dossier)) throw new SinPermisoError('valorar este dossier');
  comprobarValoracionMensual(borrador, dossier, hoy);
  if (!gestionaDossier(usuario, dossier) && (await valoraciones.obtenerFinal(dossier.id))) {
    throw new ValoracionInvalidaError('El profe ya ha puesto la valoración final');
  }
}

/** El tutor de empresa valora un mes. Cierra ese mes para el alumno. */
export async function valorarMes(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorValoracionMensual,
  hoy: string,
): Promise<ValoracionMensual> {
  await comprobarQuePuedeValorar(valoraciones, usuario, dossier, borrador, hoy);
  return valoraciones.guardarMensual({
    ...borrador,
    comentario: borrador.comentario?.trim() || null,
  });
}

export interface InformeAValorar {
  dossier: Dossier;
  /** `AAAA-MM` */
  mes: string;
}

export type ResultadoValoracionEnBloque = { dossierId: string; mes: string } & (
  { ok: true; valoracion: ValoracionMensual } | { ok: false; motivo: string }
);

/** Lo que se le cuenta al usuario: nunca el texto técnico de la base de datos. */
function motivoDelFallo(error: unknown): string {
  if (
    error instanceof SinPermisoError ||
    error instanceof ValoracionInvalidaError ||
    error instanceof ValoracionYaExisteError
  ) {
    return error.message;
  }
  if (esFalloDeRed(error)) return 'Sin conexión con el servidor. Vuelve a intentarlo.';
  return 'No se ha podido guardar. Vuelve a intentarlo.';
}

/**
 * Aplica la misma valoración a varios informes, uno a uno y con las reglas de `valorarMes`. Que uno
 * falle no para los demás. A diferencia de `valorarMes`, un mes ya valorado nunca se reemplaza.
 */
export async function valorarEnBloque(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  informes: InformeAValorar[],
  eleccion: Pick<BorradorValoracionMensual, 'valoracion' | 'comentario'>,
  hoy: string,
): Promise<ResultadoValoracionEnBloque[]> {
  const resultados: ResultadoValoracionEnBloque[] = [];
  for (const { dossier, mes } of informes) {
    const borrador = {
      dossierId: dossier.id,
      mes,
      valoracion: eleccion.valoracion,
      comentario: eleccion.comentario?.trim() || null,
    };
    try {
      await comprobarQuePuedeValorar(valoraciones, usuario, dossier, borrador, hoy);
      const valoracion = await valoraciones.crearMensual(borrador);
      resultados.push({ dossierId: dossier.id, mes, ok: true, valoracion });
    } catch (error) {
      resultados.push({ dossierId: dossier.id, mes, ok: false, motivo: motivoDelFallo(error) });
    }
  }
  return resultados;
}

/** El profe del alumno o su instituto ponen la valoración final (apto / no apto). */
export function ponerValoracionFinal(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorValoracionFinal,
): Promise<ValoracionFinal> {
  if (!gestionaDossier(usuario, dossier)) throw new SinPermisoError('poner la valoración final');
  comprobarValoracionFinal(borrador, dossier);
  return valoraciones.guardarFinal({
    ...borrador,
    comentario: borrador.comentario?.trim() || null,
  });
}

/** Solo el profe tutor del dossier confirma el mes, como el trigger de la base de datos. */
function puedeConfirmarMes(usuario: Usuario, dossier: Dossier): boolean {
  return usuario.rol === 'profe' && usuario.id === dossier.tutorId;
}

/** Comprueba quién confirma y en qué estado está el mes antes de tocar la base de datos. */
async function comprobarQuePuedeConfirmar(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  mes: string,
  confirmar: boolean,
): Promise<void> {
  if (!puedeConfirmarMes(usuario, dossier)) throw new SinPermisoError('confirmar este mes');
  comprobarConfirmacion(await valoraciones.listarMensuales(dossier.id), mes, confirmar);
}

/** El profe tutor confirma el mes que ya valoró la empresa: la doble validación del SBIT. */
export async function confirmarMes(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  mes: string,
): Promise<ValoracionMensual> {
  await comprobarQuePuedeConfirmar(valoraciones, usuario, dossier, mes, true);
  return valoraciones.confirmarMes(dossier.id, mes);
}

/** El profe tutor retira la confirmación para que la empresa corrija el mes. */
export async function quitarConfirmacion(
  valoraciones: ValoracionPort,
  usuario: Usuario,
  dossier: Dossier,
  mes: string,
): Promise<ValoracionMensual> {
  await comprobarQuePuedeConfirmar(valoraciones, usuario, dossier, mes, false);
  return valoraciones.quitarConfirmacion(dossier.id, mes);
}

export interface Seguimiento {
  mensuales: ValoracionMensual[];
  final: ValoracionFinal | null;
  /** Meses ya acabados que la empresa aún no ha valorado (`AAAA-MM`). */
  sinValorar: string[];
  /** Meses que la empresa ya valoró y el profe todavía no ha confirmado (`AAAA-MM`). */
  sinConfirmar: string[];
}

/** Lo que mira el profe para ver si el alumno va bien o mal. */
export async function obtenerSeguimiento(
  valoraciones: ValoracionPort,
  dossier: Dossier,
  hoy: string,
): Promise<Seguimiento> {
  const [mensuales, final] = await Promise.all([
    valoraciones.listarMensuales(dossier.id),
    valoraciones.obtenerFinal(dossier.id),
  ]);
  return {
    mensuales,
    final,
    sinValorar: mesesSinValorar(dossier, mensuales, hoy),
    sinConfirmar: mesesSinConfirmar(mensuales),
  };
}
