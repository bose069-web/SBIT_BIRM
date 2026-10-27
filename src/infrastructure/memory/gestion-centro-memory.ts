import type { Centro, Convenio, Empresa, Persona } from '@/core/domain/centro';
import type { GestionCentroPort } from '@/core/ports/gestion-centro-port';

// Mismos IDs que auth-memory y dossier-memory: el instituto demo administra "centro-demo".
const CENTROS: Centro[] = [{ id: 'centro-demo', nombre: 'Institut Demo' }];

const PERSONAS_DEMO: Persona[] = [
  {
    id: '1',
    nombre: 'Alumno Demo',
    email: 'alumno@kampus.test',
    rol: 'alumno',
    centroId: 'centro-demo',
    profeId: '2',
  },
  {
    id: '2',
    nombre: 'Profe Demo',
    email: 'profe@kampus.test',
    rol: 'profe',
    centroId: 'centro-demo',
    profeId: null,
  },
  {
    id: '6',
    nombre: 'Laia Puig',
    email: 'laia@kampus.test',
    rol: 'profe',
    centroId: 'centro-demo',
    profeId: null,
  },
  {
    id: '7',
    nombre: 'Marc Soler',
    email: 'marc@kampus.test',
    rol: 'alumno',
    centroId: 'centro-demo',
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
  { id: 'empresa-demo', nombre: 'Empresa Demo SL', cif: 'B00000000' },
  { id: 'empresa-2', nombre: 'Taller Digital SCP', cif: 'J11111111' },
];

export class GestionCentroMemory implements GestionCentroPort {
  private personas = PERSONAS_DEMO.map((p) => ({ ...p }));
  private empresas = [...EMPRESAS_DEMO];
  private convenios: Omit<Convenio, 'empresaNombre'>[] = [
    { centroId: 'centro-demo', empresaId: 'empresa-demo', firmadoEn: '2026-06-30' },
  ];
  private siguienteId = 1;

  async obtenerCentro(centroId: string) {
    return CENTROS.find((c) => c.id === centroId) ?? null;
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
