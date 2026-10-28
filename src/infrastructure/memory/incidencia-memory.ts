import type {
  BorradorIncidencia,
  CambiosIncidencia,
  Incidencia,
  MensajeIncidencia,
} from '@/core/domain/incidencia';
import { participaEnIncidencia } from '@/core/domain/incidencia';
import type { IncidenciaPort } from '@/core/ports/incidencia-port';

import { sesionMemory } from './auth-memory';
import { DOSSIERS_DEMO, IDS_DEMO, USUARIOS_DEMO } from './datos-demo';

const INCIDENCIAS_DEMO: Incidencia[] = [
  {
    id: 'incidencia-demo-1',
    centroId: IDS_DEMO.centro,
    dossierId: IDS_DEMO.dossier,
    tutorId: IDS_DEMO.profe,
    creadaPor: IDS_DEMO.alumno,
    creadaPorNombre: 'Alumno Demo',
    titulo: 'No me han dado acceso al repositorio de la empresa',
    descripcion: 'Llevo una semana sin poder trabajar en el proyecto asignado.',
    categoria: 'empresa',
    prioridad: 'alta',
    estado: 'abierta',
    escalada: false,
    respuesta: null,
    atendidaPor: null,
    creadaEn: '2026-10-22T08:30:00.000Z',
    resueltaEn: null,
  },
  {
    id: 'incidencia-demo-2',
    centroId: null,
    dossierId: null,
    tutorId: null,
    creadaPor: IDS_DEMO.empresa,
    creadaPorNombre: 'Tutor Empresa Demo',
    titulo: 'El convenio caduca a final de curso',
    descripcion: '¿Cómo lo renovamos para acoger alumnos el año que viene?',
    categoria: 'convenio',
    prioridad: 'media',
    estado: 'en_curso',
    escalada: false,
    respuesta: 'Lo estamos revisando con los institutos.',
    atendidaPor: IDS_DEMO.generalitat,
    creadaEn: '2026-10-18T12:00:00.000Z',
    resueltaEn: null,
  },
];

const MENSAJES_DEMO: MensajeIncidencia[] = [
  {
    id: 'mensaje-demo-1',
    incidenciaId: 'incidencia-demo-1',
    autorId: IDS_DEMO.profe,
    autorNombre: 'Profe Demo',
    texto: 'He llamado a tu tutor de empresa: esta semana te dan acceso.',
    creadoEn: '2026-10-22T11:00:00.000Z',
  },
];

function sesion() {
  const usuario = sesionMemory();
  if (!usuario) throw new Error('No hay sesión iniciada');
  return usuario;
}

/** Imita RLS y los triggers de Supabase. */
export class IncidenciaMemory implements IncidenciaPort {
  private incidencias = INCIDENCIAS_DEMO.map((i) => ({ ...i }));
  private mensajes = [...MENSAJES_DEMO];
  private siguienteId = 1;

  async listar() {
    const usuario = sesion();
    return this.incidencias.filter((i) => participaEnIncidencia(usuario, i)).map((i) => ({ ...i }));
  }

  async abrir(b: BorradorIncidencia) {
    const usuario = sesion();
    const dossier = b.dossierId ? DOSSIERS_DEMO.find((d) => d.id === b.dossierId) : undefined;
    const incidencia: Incidencia = {
      ...b,
      id: `incidencia-${this.siguienteId++}`,
      centroId: dossier ? dossier.centroId : usuario.centroId,
      tutorId: dossier?.tutorId ?? null,
      creadaPor: usuario.id,
      creadaPorNombre: USUARIOS_DEMO.find((u) => u.id === usuario.id)?.nombre ?? usuario.nombre,
      prioridad: 'media',
      estado: 'abierta',
      escalada: false,
      respuesta: null,
      atendidaPor: null,
      creadaEn: new Date().toISOString(),
      resueltaEn: null,
    };
    this.incidencias.push(incidencia);
    return { ...incidencia };
  }

  async corregir(id: string, titulo: string, descripcion: string) {
    return this.cambiar(id, { titulo, descripcion });
  }

  async atender(id: string, c: CambiosIncidencia) {
    const cambios: Partial<Incidencia> = { atendidaPor: sesion().id };
    if (c.estado !== undefined) {
      cambios.estado = c.estado;
      cambios.resueltaEn = c.estado === 'resuelta' ? new Date().toISOString() : null;
    }
    if (c.prioridad !== undefined) cambios.prioridad = c.prioridad;
    if (c.respuesta !== undefined) cambios.respuesta = c.respuesta;
    if (c.escalada !== undefined) cambios.escalada = c.escalada;
    return this.cambiar(id, cambios);
  }

  async borrar(id: string) {
    this.incidencias = this.incidencias.filter((i) => i.id !== id);
  }

  async listarMensajes(incidenciaId: string) {
    return this.mensajes.filter((m) => m.incidenciaId === incidenciaId);
  }

  async enviarMensaje(incidenciaId: string, texto: string) {
    const usuario = sesion();
    const mensaje: MensajeIncidencia = {
      id: `mensaje-${this.siguienteId++}`,
      incidenciaId,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      texto,
      creadoEn: new Date().toISOString(),
    };
    this.mensajes.push(mensaje);
    return mensaje;
  }

  private cambiar(id: string, cambios: Partial<Incidencia>) {
    const incidencia = this.incidencias.find((i) => i.id === id);
    if (!incidencia) throw new Error('La incidencia no existe');
    Object.assign(incidencia, cambios);
    return { ...incidencia };
  }
}
