import type { Centro, Convenio, Empresa, Persona } from '../domain/centro';
import type { BorradorDossier, Dossier } from '../domain/dossier';
import type { BorradorEvento, Evento } from '../domain/evento';
import type { BorradorRegistro, RegistroDiario } from '../domain/registro-diario';
import type { Usuario } from '../domain/usuario';
import type {
  BorradorValoracionFinal,
  BorradorValoracionMensual,
  ValoracionFinal,
  ValoracionMensual,
} from '../domain/valoracion';
import type { BorradorTarea, Tarea } from '../domain/tarea';
import type { DossierPort } from '../ports/dossier-port';
import type { EventoPort } from '../ports/evento-port';
import type { GestionCentroPort } from '../ports/gestion-centro-port';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import type { TareaPort } from '../ports/tarea-port';
import type { ValoracionPort } from '../ports/valoracion-port';

// Datos y dobles de prueba en TypeScript puro: los tests del núcleo no dependen de ningún adaptador.
import type {
  BorradorIncidencia,
  CambiosIncidencia,
  Incidencia,
  MensajeIncidencia,
} from '../domain/incidencia';
import type { IncidenciaPort } from '../ports/incidencia-port';
import type { DiaParaInforme, DossierParaInforme } from '../domain/informe';
import type { InformePort } from '../ports/informe-port';

export const alumno: Usuario = {
  id: 'a1',
  nombre: 'Ana',
  email: 'ana@kampus.test',
  rol: 'alumno',
  centroId: 'c1',
};
export const otroAlumno: Usuario = {
  id: 'a2',
  nombre: 'Leo',
  email: 'leo@kampus.test',
  rol: 'alumno',
  centroId: 'c1',
};
export const empresa: Usuario = {
  id: 'e1',
  nombre: 'Eva',
  email: 'eva@kampus.test',
  rol: 'empresa',
  centroId: null,
};
export const otraEmpresa: Usuario = {
  id: 'e2',
  nombre: 'Max',
  email: 'max@kampus.test',
  rol: 'empresa',
  centroId: null,
};
export const profe: Usuario = {
  id: 'p1',
  nombre: 'Pau',
  email: 'pau@kampus.test',
  rol: 'profe',
  centroId: 'c1',
};

export const otroProfe: Usuario = {
  id: 'p2',
  nombre: 'Rut',
  email: 'rut@kampus.test',
  rol: 'profe',
  centroId: 'c1',
};
export const instituto: Usuario = {
  id: 'i1',
  nombre: 'Institut',
  email: 'institut@kampus.test',
  rol: 'instituto',
  centroId: 'c1',
};
export const otroInstituto: Usuario = {
  id: 'i2',
  nombre: 'Altre Institut',
  email: 'altre@kampus.test',
  rol: 'instituto',
  centroId: 'c2',
};
export const generalitat: Usuario = {
  id: 'g1',
  nombre: 'Generalitat',
  email: 'gene@kampus.test',
  rol: 'generalitat',
  centroId: null,
};

export function crearDossier(cambios: Partial<Dossier> = {}): Dossier {
  return {
    id: 'd1',
    alumnoId: alumno.id,
    alumnoNombre: alumno.nombre,
    tutorId: profe.id,
    tutorNombre: profe.nombre,
    tutorEmpresaId: empresa.id,
    tutorEmpresaNombre: empresa.nombre,
    ciclo: 'DAM',
    centroId: 'c1',
    empresaId: 'emp1',
    empresa: 'Empresa SL',
    centro: 'Institut',
    fechaInicio: '2026-09-15',
    fechaFin: '2027-03-15',
    horasTotales: 400,
    actividades: [
      { id: 'act1', descripcion: 'Interfaces', orden: 1 },
      { id: 'act2', descripcion: 'Datos', orden: 2 },
    ],
    ...cambios,
  };
}

export function borrador(cambios: Partial<BorradorRegistro> = {}): BorradorRegistro {
  return {
    dossierId: 'd1',
    fecha: '2026-10-20',
    tipo: 'trabajo',
    horas: [{ actividadId: 'act1', horas: 6 }],
    observaciones: null,
    ...cambios,
  };
}

export class RegistrosFalsos implements RegistroDiarioPort {
  dias: RegistroDiario[] = [];
  async listar(dossierId: string, desde: string, hasta: string) {
    return this.dias.filter(
      (d) => d.dossierId === dossierId && d.fecha >= desde && d.fecha <= hasta,
    );
  }
  async obtenerPorFecha(dossierId: string, fecha: string) {
    return this.dias.find((d) => d.dossierId === dossierId && d.fecha === fecha) ?? null;
  }
  async guardar(b: BorradorRegistro) {
    const dia: RegistroDiario = { ...b, id: `r-${b.fecha}` };
    this.dias = [...this.dias.filter((d) => d.id !== dia.id), dia];
    return dia;
  }
  async eliminar(id: string) {
    this.dias = this.dias.filter((d) => d.id !== id);
  }
}

export class ValoracionesFalsas implements ValoracionPort {
  mensuales: ValoracionMensual[] = [];
  final: ValoracionFinal | null = null;
  async listarMensuales() {
    return this.mensuales;
  }
  async guardarMensual(b: BorradorValoracionMensual) {
    const v: ValoracionMensual = { ...b, id: `v-${b.mes}`, valoradaPor: 'x', valoradaEn: '' };
    this.mensuales = [...this.mensuales.filter((m) => m.mes !== b.mes), v];
    return v;
  }
  async obtenerFinal() {
    return this.final;
  }
  async guardarFinal(b: BorradorValoracionFinal) {
    this.final = { ...b, valoradaPor: 'x', valoradaEn: '' };
    return this.final;
  }
}

export class TareasFalsas implements TareaPort {
  tareas: Tarea[] = [];
  async listar(dossierId: string) {
    return this.tareas.filter((t) => t.dossierId === dossierId);
  }
  async crear(b: BorradorTarea) {
    const t: Tarea = { ...b, id: `t${this.tareas.length + 1}`, completada: false, creadaPor: 'x' };
    this.tareas.push(t);
    return t;
  }
  async marcar(id: string, completada: boolean) {
    const t = this.tareas.find((x) => x.id === id);
    if (!t) throw new Error('No existe');
    t.completada = completada;
    return t;
  }
  async borrar(id: string) {
    this.tareas = this.tareas.filter((t) => t.id !== id);
  }
}

export class EventosFalsos implements EventoPort {
  eventos: Evento[] = [];
  async listar(desde: string, hasta: string) {
    return this.eventos.filter((e) => e.fecha >= desde && e.fecha <= hasta);
  }
  async crear(b: BorradorEvento) {
    const e: Evento = { ...b, id: `e${this.eventos.length + 1}` };
    this.eventos.push(e);
    return e;
  }
  async borrar(id: string) {
    this.eventos = this.eventos.filter((e) => e.id !== id);
  }
}

export function crearDossierInforme(cambios: Partial<DossierParaInforme> = {}): DossierParaInforme {
  return {
    id: 'd1',
    alumnoId: alumno.id,
    alumnoNombre: alumno.nombre,
    tutorId: profe.id,
    tutorNombre: profe.nombre,
    tutorEmpresaId: empresa.id,
    centroId: 'c1',
    centro: 'Institut',
    empresaId: 'emp1',
    empresa: 'Empresa SL',
    horasTotales: 400,
    ...cambios,
  };
}

export function crearDia(cambios: Partial<DiaParaInforme> = {}): DiaParaInforme {
  return { dossierId: 'd1', fecha: '2026-10-20', horas: 6, ...cambios };
}

export class InformesFalsos implements InformePort {
  dossiers: DossierParaInforme[] = [];
  dias: DiaParaInforme[] = [];
  async obtenerDatos() {
    return { dossiers: this.dossiers, dias: this.dias };
  }
}

export const persona = (p: Partial<Persona> & Pick<Persona, 'id' | 'nombre' | 'rol'>): Persona => ({
  email: `${p.id}@kampus.test`,
  centroId: 'c1',
  profeId: null,
  ...p,
});

export const PAU = persona({ id: 'p1', nombre: 'Pau', rol: 'profe' });
export const RUT = persona({ id: 'p9', nombre: 'Rut', rol: 'profe', centroId: 'c2' });
export const ANA = persona({ id: 'a1', nombre: 'Ana', rol: 'alumno', profeId: 'p1' });
export const BIEL = persona({ id: 'a2', nombre: 'Biel', rol: 'alumno' });
export const NUEVA = persona({ id: 'n1', nombre: 'Nora', rol: 'alumno', centroId: null });

export class CentrosFalsos implements GestionCentroPort {
  centros: Centro[] = [{ id: 'c1', nombre: 'Institut', codigo: '08000001' }];
  personas = [PAU, ANA, BIEL, NUEVA].map((p) => ({ ...p }));
  empresas: Empresa[] = [
    { id: 'e1', nombre: 'Zeta SL', cif: null },
    { id: 'e2', nombre: 'Alfa SL', cif: null },
  ];
  convenios: Convenio[] = [
    { centroId: 'c1', empresaId: 'e1', empresaNombre: 'Zeta SL', firmadoEn: null },
  ];
  async listarCentros() {
    return this.centros;
  }
  async crearCentro(datos: { nombre: string; codigo: string }) {
    const centro: Centro = { id: `c${this.centros.length + 1}`, ...datos };
    this.centros.push(centro);
    return centro;
  }
  async obtenerCentro(id: string) {
    return this.centros.find((c) => c.id === id) ?? null;
  }
  async listarPersonas() {
    return this.personas;
  }
  async incorporarAlumno(id: string, centroId: string) {
    this.personas.find((p) => p.id === id)!.centroId = centroId;
  }
  async asignarProfe(id: string, profeId: string | null) {
    this.personas.find((p) => p.id === id)!.profeId = profeId;
  }
  async listarEmpresas() {
    return this.empresas;
  }
  tutores: (Persona & { empresaId: string })[] = [
    { ...persona({ id: 't1', nombre: 'Teo', rol: 'empresa', centroId: null }), empresaId: 'e1' },
  ];
  async listarTutoresEmpresa(empresaId: string) {
    return this.tutores.filter((t) => t.empresaId === empresaId);
  }
  async crearEmpresa(nombre: string, cif: string | null) {
    const e = { id: `e${this.empresas.length + 1}`, nombre, cif };
    this.empresas.push(e);
    return e;
  }
  async listarConvenios() {
    return this.convenios;
  }
  async crearConvenio(centroId: string, empresaId: string, firmadoEn: string | null) {
    this.convenios.push({ centroId, empresaId, empresaNombre: '', firmadoEn });
  }
  async eliminarConvenio(centroId: string, empresaId: string) {
    this.convenios = this.convenios.filter(
      (c) => !(c.centroId === centroId && c.empresaId === empresaId),
    );
  }
}

export class DossiersFalsos implements DossierPort {
  dossiers: Dossier[] = [];
  guardados: BorradorDossier[] = [];
  async listar() {
    return this.dossiers;
  }
  async obtener(id: string) {
    return this.dossiers.find((d) => d.id === id) ?? null;
  }
  async guardar(b: BorradorDossier) {
    this.guardados.push(b);
    const d = crearDossier({
      ...b,
      id: b.id ?? `d${this.guardados.length + 1}`,
      actividades: b.actividades.map((a, i) => ({
        id: a.id ?? `nueva${i}`,
        descripcion: a.descripcion,
        orden: i + 1,
      })),
    });
    this.dossiers = [...this.dossiers.filter((x) => x.id !== d.id), d];
    return d;
  }
  async borrar(id: string) {
    this.dossiers = this.dossiers.filter((d) => d.id !== id);
  }
}

export function crearIncidencia(cambios: Partial<Incidencia> = {}): Incidencia {
  return {
    id: 'inc1',
    centroId: 'c1',
    dossierId: 'd1',
    tutorId: profe.id,
    creadaPor: alumno.id,
    creadaPorNombre: alumno.nombre,
    titulo: 'La empresa no me deja registrar',
    descripcion: 'Detalle',
    categoria: 'empresa',
    prioridad: 'media',
    estado: 'abierta',
    escalada: false,
    respuesta: null,
    atendidaPor: null,
    creadaEn: '2026-10-20T10:00:00.000Z',
    resueltaEn: null,
    ...cambios,
  };
}

export class IncidenciasFalsas implements IncidenciaPort {
  incidencias: Incidencia[] = [];
  cambios: CambiosIncidencia[] = [];
  async listar() {
    return this.incidencias;
  }
  async abrir(b: BorradorIncidencia) {
    const i = crearIncidencia({ ...b, id: `inc${this.incidencias.length + 1}` });
    this.incidencias.push(i);
    return i;
  }
  async corregir(id: string, titulo: string, descripcion: string) {
    return this.cambiar(id, { titulo, descripcion });
  }
  async atender(id: string, cambios: CambiosIncidencia) {
    this.cambios.push(cambios);
    const definidos = Object.fromEntries(
      Object.entries(cambios).filter(([, v]) => v !== undefined),
    );
    return this.cambiar(id, definidos);
  }
  async borrar(id: string) {
    this.incidencias = this.incidencias.filter((i) => i.id !== id);
  }
  mensajes: MensajeIncidencia[] = [];
  async listarMensajes(incidenciaId: string) {
    return this.mensajes.filter((m) => m.incidenciaId === incidenciaId);
  }
  async enviarMensaje(incidenciaId: string, texto: string) {
    const m: MensajeIncidencia = {
      id: `m${this.mensajes.length + 1}`,
      incidenciaId,
      autorId: 'x',
      autorNombre: null,
      texto,
      creadoEn: '',
    };
    this.mensajes.push(m);
    return m;
  }
  private cambiar(id: string, cambios: Partial<Incidencia>) {
    const i = this.incidencias.find((x) => x.id === id);
    if (!i) throw new Error('No existe');
    Object.assign(i, cambios);
    return i;
  }
}
