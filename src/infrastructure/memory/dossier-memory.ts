import type { Dossier } from '@/core/domain/dossier';
import type { DossierPort } from '@/core/ports/dossier-port';

// Mínimo para que la app funcione sin Supabase. PC 3 puede ampliarlo con datos de prueba realistas.
export const DOSSIER_DEMO: Dossier = {
  id: 'dossier-demo',
  alumnoId: '1',
  alumnoNombre: 'Alumno Demo',
  tutorId: '2',
  tutorNombre: 'Profe Demo',
  tutorEmpresaId: '3',
  tutorEmpresaNombre: 'Tutor Empresa Demo',
  ciclo: 'DAM',
  centroId: 'centro-demo',
  empresaId: 'empresa-demo',
  empresa: 'Empresa Demo SL',
  centro: 'Institut Demo',
  fechaInicio: '2026-09-15',
  fechaFin: '2027-03-15',
  horasTotales: 400,
  actividades: [
    { id: 'act-1', descripcion: 'Desarrollo de interfaces', orden: 1 },
    { id: 'act-2', descripcion: 'Acceso a datos', orden: 2 },
    { id: 'act-3', descripcion: 'Pruebas y documentación', orden: 3 },
  ],
};

export class DossierMemory implements DossierPort {
  constructor(private readonly dossiers: Dossier[] = [DOSSIER_DEMO]) {}

  async listar() {
    return this.dossiers;
  }

  async obtener(id: string) {
    return this.dossiers.find((d) => d.id === id) ?? null;
  }
}
