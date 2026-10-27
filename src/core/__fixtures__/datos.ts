import type { Dossier } from '../domain/dossier';
import type { BorradorRegistro, RegistroDiario } from '../domain/registro-diario';
import type { Usuario } from '../domain/usuario';
import type {
  BorradorValoracionFinal,
  BorradorValoracionMensual,
  ValoracionFinal,
  ValoracionMensual,
} from '../domain/valoracion';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';
import type { ValoracionPort } from '../ports/valoracion-port';

// Datos y dobles de prueba en TypeScript puro: los tests del núcleo no dependen de ningún adaptador.

export const alumno: Usuario = { id: 'a1', nombre: 'Ana', email: 'ana@kampus.test', rol: 'alumno' };
export const otroAlumno: Usuario = {
  id: 'a2',
  nombre: 'Leo',
  email: 'leo@kampus.test',
  rol: 'alumno',
};
export const empresa: Usuario = {
  id: 'e1',
  nombre: 'Eva',
  email: 'eva@kampus.test',
  rol: 'empresa',
};
export const otraEmpresa: Usuario = {
  id: 'e2',
  nombre: 'Max',
  email: 'max@kampus.test',
  rol: 'empresa',
};
export const profe: Usuario = { id: 'p1', nombre: 'Pau', email: 'pau@kampus.test', rol: 'profe' };

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
