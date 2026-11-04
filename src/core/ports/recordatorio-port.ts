import type { HoraRecordatorio } from '../domain/recordatorio';

export interface ContenidoRecordatorio {
  titulo: string;
  cuerpo: string;
}

/** Notificaciones locales del dispositivo: no pasan por ningún servidor. */
export interface RecordatorioPort {
  /** `false` donde no hay notificaciones (la web). */
  readonly disponible: boolean;
  pedirPermiso(): Promise<boolean>;
  /** Sustituye el recordatorio diario que hubiera. */
  programarDiario(hora: HoraRecordatorio, contenido: ContenidoRecordatorio): Promise<void>;
  /** Uno suelto dentro de unos segundos, para comprobar que llegan. */
  programarPrueba(segundos: number, contenido: ContenidoRecordatorio): Promise<void>;
  cancelar(): Promise<void>;
  estaProgramado(): Promise<boolean>;
}
