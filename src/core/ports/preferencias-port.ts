import type { PreferenciasAvisos } from '../domain/preferencias-avisos';

/** Preferencias de este dispositivo, por usuario. No viajan al servidor. */
export interface PreferenciasPort {
  /** Si no hay nada guardado o no se entiende, devuelve las iniciales. */
  leerAvisos(usuarioId: string): Promise<PreferenciasAvisos>;
  guardarAvisos(usuarioId: string, preferencias: PreferenciasAvisos): Promise<void>;
}
