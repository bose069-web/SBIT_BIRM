/** Almacén de texto del dispositivo. No conoce el formato: lo interpreta el núcleo. */
export interface BorradorPort {
  /** El texto guardado o `null`; un almacén que no se puede leer cuenta como vacío. */
  leer(clave: string): Promise<string | null>;
  /** Falla si no se ha podido escribir: nunca se avisa de un guardado que no ocurrió. */
  guardar(clave: string, contenido: string): Promise<void>;
  borrar(clave: string): Promise<void>;
}
