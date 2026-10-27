import type { Dossier } from '@/core/domain/dossier';
import type { Usuario } from '@/core/domain/usuario';
import type { DossierPort } from '@/core/ports/dossier-port';

import { sesionMemory } from './auth-memory';
import { DOSSIERS_DEMO } from './datos-demo';

/** Como RLS en Supabase: cada usuario solo ve los dossiers que le corresponden. */
function esVisible(dossier: Dossier, usuario: Usuario | null): boolean {
  if (!usuario) return false;
  if (usuario.rol === 'profe') return true;
  if (usuario.rol === 'empresa') return dossier.tutorEmpresaId === usuario.id;
  return dossier.alumnoId === usuario.id;
}

export class DossierMemory implements DossierPort {
  constructor(private readonly dossiers: Dossier[] = DOSSIERS_DEMO) {}

  async listar() {
    const usuario = sesionMemory();
    return this.dossiers.filter((dossier) => esVisible(dossier, usuario));
  }

  async obtener(id: string) {
    const dossier = this.dossiers.find((d) => d.id === id) ?? null;
    return dossier && esVisible(dossier, sesionMemory()) ? dossier : null;
  }
}
