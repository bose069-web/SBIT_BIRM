import type { Seguimiento } from '@/core/application/valoracion';
import type { Incidencia } from '@/core/domain/incidencia';
import { mesCerrado } from '@/core/domain/valoracion';

import type { AlumnoSinApuntar } from './avisos-profe';
import { fechaCorta, nombreMes } from './fechas';
import type { InformePendiente } from './validaciones';

// Qué tiene pendiente cada rol y adónde le lleva cada aviso. Solo traduce los datos que ya cargan
// los paneles: aquí no se calcula ninguna métrica nueva.

export interface DestinoPendiente {
  pathname: '/' | '/alumnos' | '/centro' | '/chat' | '/registro';
  params?: Record<string, string>;
}

export interface Pendiente {
  id: string;
  titulo: string;
  detalle: string;
  /** La siguiente acción, en pocas palabras. */
  accion: string;
  destino: DestinoPendiente;
  /** Lo que urge de este aviso, si hay algo que resaltar. */
  etiqueta?: string;
  /** Las obligaciones son `importante` y nunca se ocultan. Lo `secundario` no depende de ti. */
  prioridad: PrioridadPendiente;
}

export type PrioridadPendiente = 'importante' | 'secundario';

/**
 * Lo que enseña la tarjeta: sin duplicados, lo importante siempre y lo secundario según la
 * preferencia. Ocultar solo afecta a lo secundario: las obligaciones no se pueden esconder.
 */
export function organizarPendientes(pendientes: Pendiente[], ocultarSecundarios: boolean) {
  const unicos = [...new Map(pendientes.map((p) => [p.id, p])).values()];
  const secundarios = unicos.filter((p) => p.prioridad === 'secundario');
  return {
    importantes: unicos.filter((p) => p.prioridad === 'importante'),
    secundarios: ocultarSecundarios ? [] : secundarios,
    ocultos: ocultarSecundarios ? secundarios.length : 0,
    haySecundarios: secundarios.length > 0,
  };
}

type IncidenciaPendiente = Pick<Incidencia, 'id' | 'titulo' | 'estado' | 'creadaPorNombre'>;

const abierta = (i: IncidenciaPendiente) => i.estado !== 'resuelta';
const plural = (n: number, una: string, varias: string) => (n === 1 ? una : varias);

function destinoIncidencia(id: string): DestinoPendiente {
  return { pathname: '/chat', params: { incidencia: id } };
}

/** Una incidencia abre su conversación; varias se juntan en un aviso que lleva al chat. */
function avisosIncidencias(
  incidencias: IncidenciaPendiente[],
  prioridad: PrioridadPendiente,
  detalleDeUna: (i: IncidenciaPendiente) => string,
): Pendiente[] {
  const abiertas = incidencias.filter(abierta);
  if (abiertas.length === 0) return [];
  if (abiertas.length === 1) {
    const [i] = abiertas;
    return [
      {
        id: 'incidencias',
        titulo: i.titulo,
        detalle: detalleDeUna(i),
        accion: 'Abrir',
        destino: destinoIncidencia(i.id),
        prioridad,
      },
    ];
  }
  return [
    {
      id: 'incidencias',
      titulo: `${abiertas.length} incidencias abiertas`,
      detalle: abiertas[0].titulo,
      accion: 'Ver chat',
      destino: { pathname: '/chat' },
      prioridad,
    },
  ];
}

export interface DatosPendientesAlumno {
  hoy: string;
  /** Laborables sin apuntar, del más antiguo al más reciente (ver `calcularProgreso`). */
  sinApuntar: string[];
  seguimiento: Pick<Seguimiento, 'mensuales' | 'final'>;
  /** Null si no se han podido cargar. */
  incidencias: IncidenciaPendiente[] | null;
}

export function pendientesAlumno(datos: DatosPendientesAlumno): Pendiente[] {
  const { hoy, seguimiento } = datos;
  // Un mes ya valorado no admite cambios: avisar de esos días llevaría a un formulario cerrado.
  const apuntables = datos.sinApuntar.filter(
    (f) => !mesCerrado(f, seguimiento.mensuales, seguimiento.final),
  );
  const anteriores = apuntables.filter((f) => f !== hoy);
  const lista: Pendiente[] = [];
  if (apuntables.includes(hoy)) {
    lista.push({
      id: 'hoy',
      titulo: 'Registra el día de hoy',
      detalle: fechaCorta(hoy),
      accion: 'Registrar',
      destino: { pathname: '/registro', params: { fecha: hoy } },
      etiqueta: 'Hoy',
      prioridad: 'importante',
    });
  }
  if (anteriores.length > 0) {
    lista.push({
      id: 'sin-apuntar',
      titulo:
        anteriores.length === 1 ? '1 día sin apuntar' : `${anteriores.length} días sin apuntar`,
      detalle:
        anteriores.length === 1
          ? fechaCorta(anteriores[0])
          : `Empieza por el ${fechaCorta(anteriores[0])}`,
      accion: 'Apuntar',
      destino: { pathname: '/registro', params: { fecha: anteriores[0] } },
      prioridad: 'importante',
    });
  }
  // Su incidencia la tiene que atender otro: conviene saberlo, pero no es una obligación suya.
  lista.push(
    ...avisosIncidencias(
      datos.incidencias ?? [],
      'secundario',
      () => 'Tu incidencia sigue abierta',
    ),
  );
  return lista;
}

/** Los informes de un mismo alumno van juntos: abren su valoración para elegir el mes. */
export function pendientesEmpresa(informes: InformePendiente[]): Pendiente[] {
  const porAlumno = new Map<string, InformePendiente[]>();
  for (const informe of informes) {
    porAlumno.set(informe.dossier.id, [...(porAlumno.get(informe.dossier.id) ?? []), informe]);
  }
  return [...porAlumno.entries()].map(([dossierId, suyos]): Pendiente => ({
    id: `informes-${dossierId}`,
    titulo: suyos[0].dossier.alumnoNombre,
    detalle:
      suyos.length === 1
        ? `Informe de ${nombreMes(suyos[0].mes)}`
        : `${suyos.length} informes: ${suyos.map((i) => nombreMes(i.mes)).join(', ')}`,
    accion: 'Valorar',
    destino: {
      pathname: '/',
      params:
        suyos.length === 1 ? { valorar: dossierId, mes: suyos[0].mes } : { valorar: dossierId },
    },
    prioridad: 'importante',
  }));
}

export interface DatosPendientesProfe {
  sinApuntar: AlumnoSinApuntar[];
  /** Alumnos con meses acabados que su empresa aún no ha valorado. */
  faltaValorar: { dossierId: string; nombre: string; empresa: string | null; meses: string[] }[];
  /** Incidencias de sus alumnos. */
  incidencias: IncidenciaPendiente[];
}

/**
 * Las incidencias le tocan a él. Lo demás lo tiene que hacer otro (el alumno, la empresa) y es
 * secundario; lo de un mismo alumno va en un solo aviso, que abre su ficha.
 */
export function pendientesProfe(datos: DatosPendientesProfe): Pendiente[] {
  const porAlumno = new Map<string, { nombre: string; detalles: string[] }>();
  const anotar = (dossierId: string, nombre: string, detalle: string) => {
    const alumno = porAlumno.get(dossierId) ?? { nombre, detalles: [] };
    alumno.detalles.push(detalle);
    porAlumno.set(dossierId, alumno);
  };
  for (const a of datos.sinApuntar) {
    anotar(a.dossierId, a.nombre, `${a.dias} días laborables sin apuntar`);
  }
  for (const a of datos.faltaValorar) {
    anotar(
      a.dossierId,
      a.nombre,
      `${a.empresa ?? 'Su empresa'} no ha valorado ${a.meses.map(nombreMes).join(', ')}`,
    );
  }
  return [
    ...avisosIncidencias(
      datos.incidencias,
      'importante',
      (i) => `Incidencia de ${i.creadaPorNombre ?? 'un alumno'}`,
    ),
    ...[...porAlumno.entries()].map(([dossierId, { nombre, detalles }]): Pendiente => ({
      id: `alumno-${dossierId}`,
      titulo: nombre,
      detalle: detalles.join(' · '),
      accion: 'Ver ficha',
      destino: { pathname: '/', params: { dossier: dossierId } },
      prioridad: 'secundario',
    })),
  ];
}

export interface DatosPendientesCentro {
  alumnosSinProfe: number;
  convenios: number;
  /** Incidencias por atender; null si aún no se saben. */
  incidencias: IncidenciaPendiente[] | null;
  /** Parámetros de las pantallas del centro: la generalitat lleva el instituto elegido. */
  params: Record<string, string>;
}

export function pendientesCentro(datos: DatosPendientesCentro): Pendiente[] {
  const { alumnosSinProfe, convenios, params } = datos;
  const lista = avisosIncidencias(
    datos.incidencias ?? [],
    'importante',
    () => 'Incidencia abierta',
  );
  if (alumnosSinProfe > 0) {
    lista.push({
      id: 'sin-profe',
      titulo:
        alumnosSinProfe === 1
          ? '1 alumno sin profe tutor'
          : `${alumnosSinProfe} alumnos sin profe tutor`,
      detalle: plural(alumnosSinProfe, 'Asígnale un profe', 'Asígnales un profe'),
      accion: 'Asignar',
      destino: { pathname: '/alumnos', params },
      prioridad: 'importante',
    });
  }
  if (convenios === 0) {
    lista.push({
      id: 'sin-convenios',
      titulo: 'Sin convenios con empresas',
      detalle: 'Hacen falta para que los alumnos hagan prácticas',
      accion: 'Gestionar',
      destino: { pathname: '/centro', params },
      prioridad: 'importante',
    });
  }
  return lista;
}
