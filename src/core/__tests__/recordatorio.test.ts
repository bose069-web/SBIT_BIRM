import {
  activarRecordatorio,
  desactivarRecordatorio,
  probarRecordatorio,
  recordatorioActivo,
} from '../application/recordatorio';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { HORA_RECORDATORIO_INICIAL } from '../domain/recordatorio';
import { alumno, profe } from '../__fixtures__/datos';
import { RecordatorioMemory } from '../../infrastructure/memory/recordatorio-memory';

describe('recordatorio diario', () => {
  it('el alumno lo activa a la hora por defecto y luego lo desactiva', async () => {
    const port = new RecordatorioMemory(true);
    await activarRecordatorio(port, alumno);
    expect(port.diario?.hora).toEqual(HORA_RECORDATORIO_INICIAL);
    expect(await recordatorioActivo(port)).toBe(true);
    await desactivarRecordatorio(port);
    expect(await recordatorioActivo(port)).toBe(false);
  });

  it('acepta otra hora y rechaza horas imposibles', async () => {
    const port = new RecordatorioMemory(true);
    await activarRecordatorio(port, alumno, { hora: 20, minuto: 30 });
    expect(port.diario?.hora).toEqual({ hora: 20, minuto: 30 });
    await expect(activarRecordatorio(port, alumno, { hora: 24, minuto: 0 })).rejects.toThrow(
      DatosInvalidosError,
    );
    await expect(activarRecordatorio(port, alumno, { hora: 9, minuto: 7.5 })).rejects.toThrow(
      DatosInvalidosError,
    );
  });

  it('solo es para alumnos', async () => {
    const port = new RecordatorioMemory(true);
    await expect(activarRecordatorio(port, profe)).rejects.toThrow(SinPermisoError);
    await expect(probarRecordatorio(port, profe)).rejects.toThrow(SinPermisoError);
    expect(port.diario).toBeNull();
  });

  it('sin permiso del móvil no programa nada', async () => {
    const port = new RecordatorioMemory(true, false);
    await expect(activarRecordatorio(port, alumno)).rejects.toThrow(DatosInvalidosError);
    expect(port.diario).toBeNull();
  });

  it('donde no hay notificaciones (web) no se activa ni rompe al desactivar', async () => {
    const port = new RecordatorioMemory(false);
    await expect(activarRecordatorio(port, alumno)).rejects.toThrow(DatosInvalidosError);
    await expect(desactivarRecordatorio(port)).resolves.toBeUndefined();
    expect(await recordatorioActivo(port)).toBe(false);
  });

  it('la prueba programa un aviso suelto', async () => {
    const port = new RecordatorioMemory(true);
    await probarRecordatorio(port, alumno);
    expect(port.pruebas).toHaveLength(1);
    expect(port.diario).toBeNull();
  });
});
