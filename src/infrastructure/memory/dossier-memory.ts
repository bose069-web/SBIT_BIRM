import type { BorradorDossier, Dossier } from '@/core/domain/dossier';
import type { Usuario } from '@/core/domain/usuario';
import type { DossierPort } from '@/core/ports/dossier-port';

import { sesionMemory } from './auth-memory';
import { DOSSIERS_DEMO, IDS_DEMO, USUARIOS_DEMO } from './datos-demo';

/** Como RLS en Supabase: cada usuario solo ve los dossiers que le corresponden. */
function esVisible(dossier: Dossier, usuario: Usuario | null): boolean {
  if (!usuario) return false;
  switch (usuario.rol) {
    case 'generalitat':
      return true;
    case 'instituto':
      return dossier.centroId === usuario.centroId;
    case 'profe':
      return dossier.tutorId === usuario.id;
    case 'empresa':
      return dossier.tutorEmpresaId === usuario.id;
    case 'alumno':
      return dossier.alumnoId === usuario.id;
  }
}

export class DossierMemory implements DossierPort {
  private dossiers: Dossier[];
  private siguienteId = 1;

  constructor(dossiers: Dossier[] = DOSSIERS_DEMO) {
    this.dossiers = [...dossiers];
  }

  async listar() {
    const usuario = sesionMemory();
    return this.dossiers.filter((dossier) => esVisible(dossier, usuario));
  }

  async obtener(id: string) {
    const dossier = this.dossiers.find((d) => d.id === id) ?? null;
    return dossier && esVisible(dossier, sesionMemory()) ? dossier : null;
  }

  async guardar(b: BorradorDossier) {
    const actual = b.id ? this.dossiers.find((d) => d.id === b.id) : undefined;
    if (b.id && !actual) throw new Error('El dossier no existe');
    const nombre = (id: string | null) => USUARIOS_DEMO.find((u) => u.id === id)?.nombre ?? null;
    const empresa = this.dossiers.find((d) => d.empresaId === b.empresaId)?.empresa ?? 'Empresa';
    // Como el trigger de Supabase: el tutor es el profe del alumno (en la demo, Profe Demo).
    const tutorId = actual?.tutorId ?? IDS_DEMO.profe;
    const dossier: Dossier = {
      id: actual?.id ?? `dossier-nuevo-${this.siguienteId++}`,
      alumnoId: b.alumnoId,
      alumnoNombre: nombre(b.alumnoId) ?? 'Alumno',
      tutorId,
      tutorNombre: nombre(tutorId),
      tutorEmpresaId: b.tutorEmpresaId,
      tutorEmpresaNombre: nombre(b.tutorEmpresaId),
      ciclo: b.ciclo,
      centroId: b.centroId,
      centro:
        actual?.centro ?? this.dossiers.find((d) => d.centroId === b.centroId)?.centro ?? null,
      empresaId: b.empresaId,
      empresa,
      fechaInicio: b.fechaInicio,
      fechaFin: b.fechaFin,
      horasTotales: b.horasTotales,
      actividades: b.actividades.map((a, i) => ({
        id: a.id ?? `actividad-nueva-${this.siguienteId++}`,
        descripcion: a.descripcion,
        orden: i + 1,
      })),
    };
    this.dossiers = [...this.dossiers.filter((d) => d.id !== dossier.id), dossier];
    return dossier;
  }

  async borrar(id: string) {
    this.dossiers = this.dossiers.filter((d) => d.id !== id);
  }
}
