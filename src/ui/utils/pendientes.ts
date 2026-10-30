import type { Seguimiento } from '@/core/application/valoracion';
import type { Incidencia } from '@/core/domain/incidencia';
import { tareaVencida, type Tarea } from '@/core/domain/tarea';
import { mesCerrado } from '@/core/domain/valoracion';

import type { AlumnoSinApuntar } from './avisos-profe';
import { fechaCorta, nombreMes } from './fechas';
import type { InformePendiente } from './validaciones';

// Qué tiene pendiente cada rol y adónde le lleva cada aviso. Solo traduce los datos que ya cargan
// los paneles: aquí no se calcula ninguna métrica nueva.

export type DestinoPendiente =
  | {
      pathname: '/' | '/alumnos' | '/centro' | '/chat' | '/registro';
      params?: Record<string, string>;
    }
  /** Otra parte de la misma pantalla: la vista decide cómo llegar hasta ella. */
  | { seccion: 'tareas' };

export interface Pendiente {
  id: string;
  titulo: string;
  detalle: string;
  /** La siguiente acción, en pocas palabras. */
  accion: string;
  destino: DestinoPendiente;
  /** Lo que urge de este aviso, si hay algo que resaltar. */
  etiqueta?: string;
}

type IncidenciaPendiente = Pick<Incidencia, 'id' | 'titulo' | 'estado' | 'creadaPorNombre'>;

const abierta = (i: IncidenciaPendiente) => i.estado !== 'resuelta';
const plural = (n: number, una: string, varias: string) => (n === 1 ? una : varias);

function destinoIncidencia(id: string): DestinoPendiente {
  return { pathname: '/chat', params: { incidencia: id } };
}

export interface DatosPendientesAlumno {
  hoy: string;
  /** Laborables sin apuntar, del más antiguo al más reciente (ver `calcularProgreso`). */
  sinApuntar: string[];
  seguimiento: Pick<Seguimiento, 'mensuales' | 'final'>;
  /** Null si no se han podido cargar. */
  tareas: Pick<Tarea, 'titulo' | 'completada' | 'fechaLimite'>[] | null;
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
    });
  }
  const tareas = (datos.tareas ?? []).filter((t) => !t.completada);
  if (tareas.length > 0) {
    const vencidas = tareas.filter((t) => tareaVencida(t, hoy)).length;
    lista.push({
      id: 'tareas',
      titulo: tareas.length === 1 ? '1 tarea pendiente' : `${tareas.length} tareas pendientes`,
      detalle: tareas[0].titulo,
      accion: 'Ver tareas',
      destino: { seccion: 'tareas' },
      etiqueta: vencidas ? `${vencidas} ${plural(vencidas, 'vencida', 'vencidas')}` : undefined,
    });
  }
  for (const i of (datos.incidencias ?? []).filter(abierta)) {
    lista.push({
      id: `incidencia-${i.id}`,
      titulo: i.titulo,
      detalle: 'Tu incidencia sigue abierta',
      accion: 'Consultar',
      destino: destinoIncidencia(i.id),
    });
  }
  return lista;
}

export function pendientesEmpresa(informes: InformePendiente[]): Pendiente[] {
  return informes.map(({ dossier, mes }) => ({
    id: `informe-${dossier.id}-${mes}`,
    titulo: dossier.alumnoNombre,
    detalle: `Informe de ${nombreMes(mes)}`,
    accion: 'Valorar',
    destino: { pathname: '/', params: { valorar: dossier.id, mes } },
  }));
}

export interface DatosPendientesProfe {
  sinApuntar: AlumnoSinApuntar[];
  /** Alumnos con meses acabados que su empresa aún no ha valorado. */
  faltaValorar: { dossierId: string; nombre: string; empresa: string | null; meses: string[] }[];
  /** Incidencias de sus alumnos. */
  incidencias: IncidenciaPendiente[];
}

export function pendientesProfe(datos: DatosPendientesProfe): Pendiente[] {
  const ficha = (dossierId: string): DestinoPendiente => ({
    pathname: '/',
    params: { dossier: dossierId },
  });
  return [
    ...datos.incidencias.filter(abierta).map((i): Pendiente => ({
      id: `incidencia-${i.id}`,
      titulo: i.titulo,
      detalle: `Incidencia de ${i.creadaPorNombre ?? 'un alumno'}`,
      accion: 'Abrir',
      destino: destinoIncidencia(i.id),
    })),
    ...datos.sinApuntar.map((a): Pendiente => ({
      id: `sin-apuntar-${a.dossierId}`,
      titulo: a.nombre,
      detalle: `${a.dias} días laborables sin apuntar`,
      accion: 'Ver ficha',
      destino: ficha(a.dossierId),
    })),
    ...datos.faltaValorar.map((a): Pendiente => ({
      id: `falta-valorar-${a.dossierId}`,
      titulo: a.nombre,
      detalle: `${a.empresa ?? 'Su empresa'} no ha valorado ${a.meses.map(nombreMes).join(', ')}`,
      accion: 'Ver ficha',
      destino: ficha(a.dossierId),
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
  const incidencias = (datos.incidencias ?? []).filter(abierta);
  const lista: Pendiente[] = [];
  if (incidencias.length > 0) {
    lista.push({
      id: 'incidencias',
      titulo:
        incidencias.length === 1
          ? '1 incidencia pendiente'
          : `${incidencias.length} incidencias pendientes`,
      detalle: incidencias[0].titulo,
      accion: incidencias.length === 1 ? 'Abrir' : 'Ver chat',
      destino:
        incidencias.length === 1 ? destinoIncidencia(incidencias[0].id) : { pathname: '/chat' },
    });
  }
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
    });
  }
  if (convenios === 0) {
    lista.push({
      id: 'sin-convenios',
      titulo: 'Sin convenios con empresas',
      detalle: 'Hacen falta para que los alumnos hagan prácticas',
      accion: 'Gestionar',
      destino: { pathname: '/centro', params },
    });
  }
  return lista;
}
