import type { DetalleHistorial, EntradaHistorial } from '@/core/domain/historial';
import type { AuthPort } from '@/core/ports/auth-port';
import type { HistorialPort } from '@/core/ports/historial-port';

/** Hace de los triggers de la base de datos: los otros adaptadores en memoria le avisan. */
export class HistorialMemory implements HistorialPort {
  private entradas: EntradaHistorial[] = [];
  private siguienteId = 1;

  constructor(private readonly auth: AuthPort) {}

  async listar(dossierId: string, limite: number) {
    return this.entradas.filter((e) => e.dossierId === dossierId).slice(0, limite);
  }

  async anotar(
    dossierId: string,
    entidad: EntradaHistorial['entidad'],
    accion: EntradaHistorial['accion'],
    detalle: DetalleHistorial,
  ) {
    const usuario = await this.auth.usuarioActual();
    this.entradas.unshift({
      id: `historial-${this.siguienteId++}`,
      dossierId,
      entidad,
      accion,
      actorId: usuario?.id ?? null,
      actorRol: usuario?.rol ?? null,
      detalle,
      ocurridoEn: new Date().toISOString(),
    });
  }
}
