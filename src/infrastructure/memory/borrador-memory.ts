import type { BorradorPort } from '@/core/ports/borrador-port';

/** Para los tests y para cuando no hay localStorage (renderizado estático de la web). */
export class BorradorMemory implements BorradorPort {
  private readonly contenidos = new Map<string, string>();

  async leer(clave: string) {
    return this.contenidos.get(clave) ?? null;
  }

  async guardar(clave: string, contenido: string) {
    this.contenidos.set(clave, contenido);
  }

  async borrar(clave: string) {
    this.contenidos.delete(clave);
  }
}
