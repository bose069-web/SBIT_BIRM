import type { BorradorRegistro, RegistroDiario } from '@/core/domain/registro-diario';
import type { RegistroDiarioPort } from '@/core/ports/registro-diario-port';

import { REGISTROS_DEMO } from './datos-demo';
import type { HistorialMemory } from './historial-memory';

export class RegistroDiarioMemory implements RegistroDiarioPort {
  private registros: Map<string, RegistroDiario>;
  private siguienteId = 1;

  constructor(
    registros: RegistroDiario[] = REGISTROS_DEMO,
    private readonly historial?: HistorialMemory,
  ) {
    this.registros = new Map(registros.map((registro) => [registro.id, registro]));
  }

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
    };
    this.registros.set(registro.id, registro);
    await this.historial?.anotar(b.dossierId, 'registro', existente ? 'editar' : 'crear', {
      fecha: b.fecha,
    });
    return registro;
  }

  async eliminar(id: string) {
    const registro = this.registros.get(id);
    this.registros.delete(id);
    if (registro) {
      await this.historial?.anotar(registro.dossierId, 'registro', 'borrar', {
        fecha: registro.fecha,
      });
    }
  }
}
