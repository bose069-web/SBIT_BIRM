import type { Centro, Convenio, Empresa, Persona } from '@/core/domain/centro';
import type { GestionCentroPort } from '@/core/ports/gestion-centro-port';

import { IDS_DEMO } from './datos-demo';

// Mismos IDs que datos-demo: el instituto demo administra IDS_DEMO.centro.
const CENTROS: Centro[] = [
  { id: IDS_DEMO.centro, nombre: 'Institut Demo', codigo: '08000001' },
  { id: IDS_DEMO.otroCentro, nombre: 'Escola Pia Demo', codigo: '08000002' },
];

const PERSONAS_DEMO: Persona[] = [
  {
    id: IDS_DEMO.alumno,
    nombre: 'Alumno Demo',
    email: 'alumno@kampus.test',
    rol: 'alumno',
    centroId: IDS_DEMO.centro,
    profeId: IDS_DEMO.profe,
  },
  {
    id: IDS_DEMO.profe,
    nombre: 'Profe Demo',
    email: 'profe@kampus.test',
    rol: 'profe',
    centroId: IDS_DEMO.centro,
    profeId: null,
  },
  {
    id: '6',
    nombre: 'Laia Puig',
    email: 'laia@kampus.test',
    rol: 'profe',
    centroId: IDS_DEMO.centro,
    profeId: null,
  },
  {
    id: '7',
    nombre: 'Marc Soler',
    email: 'marc@kampus.test',
    rol: 'alumno',
    centroId: IDS_DEMO.centro,
    profeId: null,
  },
  {
    id: '8',
    nombre: 'Nora Vidal',
    email: 'nora@kampus.test',
    rol: 'alumno',
    centroId: null,
    profeId: null,
  },
];

const EMPRESAS_DEMO: Empresa[] = [
  { id: IDS_DEMO.empresaDemo, nombre: 'Empresa Demo SL', cif: 'B00000000' },
  { id: IDS_DEMO.softcat, nombre: 'Softcat Solutions SL', cif: 'B22222222' },
  { id: IDS_DEMO.nexo, nombre: 'Nexo Digital SL', cif: 'B33333333' },
];

export class GestionCentroMemory implements GestionCentroPort {
  private centros = CENTROS.map((c) => ({ ...c }));
  private personas = PERSONAS_DEMO.map((p) => ({ ...p }));
  private empresas = [...EMPRESAS_DEMO];
  private convenios: Omit<Convenio, 'empresaNombre'>[] = [
    { centroId: IDS_DEMO.centro, empresaId: IDS_DEMO.empresaDemo, firmadoEn: '2026-06-30' },
    { centroId: IDS_DEMO.centro, empresaId: IDS_DEMO.softcat, firmadoEn: '2026-07-15' },
    { centroId: IDS_DEMO.otroCentro, empresaId: IDS_DEMO.nexo, firmadoEn: '2026-07-20' },
  ];
  private siguienteId = 1;

  async listarCentros(): Promise<Centro[]> {
    return this.centros
      .map((c) => ({ ...c }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async crearCentro(datos: { nombre: string; codigo: string }): Promise<Centro> {
    if (this.centros.some((c) => c.codigo === datos.codigo)) {
      throw new Error('Ya existe un centro con ese código');
    }
    const centro: Centro = { id: `centro-nuevo-${this.siguienteId++}`, ...datos };
    this.centros.push(centro);
    return { ...centro };
  }

  async obtenerCentro(centroId: string) {
    const centro = this.centros.find((c) => c.id === centroId);
    return centro ? { ...centro } : null;
  }

  async listarPersonas(centroId: string) {
    return this.personas
      .filter((p) => p.centroId === centroId || p.centroId === null)
      .map((p) => ({ ...p }));
  }

  async incorporarAlumno(personaId: string, centroId: string) {
    this.cambiar(personaId, { centroId });
  }

  async asignarProfe(alumnoId: string, profeId: string | null) {
    this.cambiar(alumnoId, { profeId });
  }

  async listarEmpresas() {
    return [...this.empresas];
  }

  async crearEmpresa(nombre: string, cif: string | null) {
    const empresa = { id: `empresa-nueva-${this.siguienteId++}`, nombre, cif };
    this.empresas.push(empresa);
    return empresa;
  }

  async listarConvenios(centroId: string) {
    return this.convenios
      .filter((c) => c.centroId === centroId)
      .map((c) => ({
        ...c,
        empresaNombre: this.empresas.find((e) => e.id === c.empresaId)?.nombre ?? 'Empresa',
      }));
  }

  async crearConvenio(centroId: string, empresaId: string, firmadoEn: string | null) {
    if (this.convenios.some((c) => c.centroId === centroId && c.empresaId === empresaId)) return;
    this.convenios.push({ centroId, empresaId, firmadoEn });
  }

  async eliminarConvenio(centroId: string, empresaId: string) {
    this.convenios = this.convenios.filter(
      (c) => !(c.centroId === centroId && c.empresaId === empresaId),
    );
  }

  private cambiar(id: string, cambios: Partial<Persona>) {
    const persona = this.personas.find((p) => p.id === id);
    if (!persona) throw new Error('No se encuentra la persona');
    Object.assign(persona, cambios);
  }
}
