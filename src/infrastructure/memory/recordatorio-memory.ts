import type { HoraRecordatorio } from '@/core/domain/recordatorio';
import type { ContenidoRecordatorio, RecordatorioPort } from '@/core/ports/recordatorio-port';

/** Para tests y para la web, donde no hay notificaciones locales. */
export class RecordatorioMemory implements RecordatorioPort {
  diario: { hora: HoraRecordatorio; contenido: ContenidoRecordatorio } | null = null;
  pruebas: ContenidoRecordatorio[] = [];

  constructor(
    readonly disponible = false,
    private readonly permiso = true,
  ) {}

  async pedirPermiso() {
    return this.permiso;
  }

  async programarDiario(hora: HoraRecordatorio, contenido: ContenidoRecordatorio) {
    this.diario = { hora, contenido };
  }

  async programarPrueba(_segundos: number, contenido: ContenidoRecordatorio) {
    this.pruebas.push(contenido);
  }

  async cancelar() {
    this.diario = null;
  }

  async estaProgramado() {
    return this.diario !== null;
  }
}
