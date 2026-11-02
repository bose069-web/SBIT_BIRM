import {
  PREFERENCIAS_AVISOS_INICIALES,
  type PreferenciasAvisos,
} from '@/core/domain/preferencias-avisos';
import type { PreferenciasPort } from '@/core/ports/preferencias-port';

/** Para cuando no hay localStorage (renderizado estático de la web). */
export class PreferenciasMemory implements PreferenciasPort {
  private readonly avisos = new Map<string, PreferenciasAvisos>();

  async leerAvisos(usuarioId: string) {
    return this.avisos.get(usuarioId) ?? PREFERENCIAS_AVISOS_INICIALES;
  }

  async guardarAvisos(usuarioId: string, preferencias: PreferenciasAvisos) {
    this.avisos.set(usuarioId, preferencias);
  }
}
