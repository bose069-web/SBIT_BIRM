import {
  PREFERENCIAS_AVISOS_INICIALES,
  type PreferenciasAvisos,
} from '@/core/domain/preferencias-avisos';
import type { PreferenciasPort } from '@/core/ports/preferencias-port';

import type { AlmacenTexto } from './borrador-local-storage';

const clave = (usuarioId: string) => `kampus:preferencias-avisos:${usuarioId}`;

/** Mismo almacén que los borradores (ver `BorradorLocalStorage`). */
export class PreferenciasLocalStorage implements PreferenciasPort {
  constructor(private readonly almacen: AlmacenTexto) {}

  async leerAvisos(usuarioId: string): Promise<PreferenciasAvisos> {
    try {
      const datos: unknown = JSON.parse(this.almacen.getItem(clave(usuarioId)) ?? 'null');
      const ocultar =
        typeof datos === 'object' && datos !== null && 'ocultarSecundarios' in datos
          ? datos.ocultarSecundarios
          : null;
      return typeof ocultar === 'boolean'
        ? { ocultarSecundarios: ocultar }
        : PREFERENCIAS_AVISOS_INICIALES;
    } catch {
      return PREFERENCIAS_AVISOS_INICIALES;
    }
  }

  async guardarAvisos(usuarioId: string, preferencias: PreferenciasAvisos) {
    this.almacen.setItem(clave(usuarioId), JSON.stringify(preferencias));
  }
}
