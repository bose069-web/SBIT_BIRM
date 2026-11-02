import type { BorradorPort } from '@/core/ports/borrador-port';

/** La parte de la API de localStorage que hace falta. */
export type AlmacenTexto = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * En web usa el localStorage del navegador; en móvil, el que instala
 * `expo-sqlite/localStorage/install` (ver infrastructure/supabase/local-storage).
 */
export class BorradorLocalStorage implements BorradorPort {
  constructor(private readonly almacen: AlmacenTexto) {}

  async leer(clave: string) {
    try {
      return this.almacen.getItem(clave);
    } catch {
      return null;
    }
  }

  async guardar(clave: string, contenido: string) {
    this.almacen.setItem(clave, contenido);
  }

  async borrar(clave: string) {
    this.almacen.removeItem(clave);
  }
}
