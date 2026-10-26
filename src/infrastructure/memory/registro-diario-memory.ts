import type { BorradorRegistro, RegistroDiario } from '@/core/domain/registro-diario';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';

export class RegistroDiarioMemory implements RegistroDiarioPort {
  private registros = new Map<string, RegistroDiario>();
  private siguienteId = 1;

  async listar(dossierId: string, desde: string, hasta: string) {
    return [...this.registros.values()]
      .filter((r) => r.dossierId === dossierId && r.fecha >= desde && r.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async obtenerPorFecha(dossierId: string, fecha: string) {
    return (
      [...this.registros.values()].find((r) => r.dossierId === dossierId && r.fecha === fecha) ??
      null
    );
  }

  async guardar(b: BorradorRegistro) {
    const existente = await this.obtenerPorFecha(b.dossierId, b.fecha);
    const registro: RegistroDiario = {
      ...b,
      id: existente?.id ?? `registro-${this.siguienteId++}`,
      estado: 'pendiente',
      comentarioTutor: null,
    };
    this.registros.set(registro.id, registro);
    return registro;
  }

  async eliminar(id: string) {
    this.registros.delete(id);
  }

  async cambiarEstado(id: string, estado: 'validado' | 'rechazado', comentario: string | null) {
    const registro = this.registros.get(id);
    if (!registro) throw new Error('Registro no encontrado');
    const actualizado = { ...registro, estado, comentarioTutor: comentario };
    this.registros.set(id, actualizado);
    return actualizado;
  }
}
