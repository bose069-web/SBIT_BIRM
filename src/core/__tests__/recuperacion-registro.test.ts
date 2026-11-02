import { cargarContextoRegistro } from '../application/contexto-registro';
import { enviarDia } from '../application/registro-diario';
import { guardarBorrador, leerBorrador } from '../application/borradores';
import {
  alumno,
  otroAlumno,
  crearDossier,
  DossiersFalsos,
  ValoracionesFalsas,
} from '../__fixtures__/datos';
import { BorradorMemory } from '../../infrastructure/memory/borrador-memory';
import { RegistroDiarioMemory } from '../../infrastructure/memory/registro-diario-memory';
import { validarValoresDia, huellaRegistro } from '../domain/registro-diario';
import { ConflictoRegistroError, SinConexionError } from '../domain/errores';

const fecha = '2026-10-20';
const dossier = crearDossier();
const clave = { ambito: 'registro-dia', usuarioId: alumno.id, contexto: [dossier.id, fecha] };
const valores = {
  tipo: 'trabajo' as const,
  horas: [{ actividadId: 'act1', horas: 4 }],
  observaciones: '',
};
const envio = { fecha, valores, huellaBase: null, ahora: '2026-10-20T10:00:00Z' };
function escenario() {
  const dossiers = new DossiersFalsos();
  dossiers.dossiers = [dossier];
  return {
    dossiers,
    registros: new RegistroDiarioMemory([]),
    borradores: new BorradorMemory(),
    valoraciones: new ValoracionesFalsas(),
  };
}

it('no confirma persistencia cuando fallan la red y el almacenamiento', async () => {
  const p = escenario();
  p.registros.guardar = async () => {
    throw new SinConexionError();
  };
  p.borradores.guardar = async () => {
    throw new Error('QuotaExceededError');
  };
  await expect(enviarDia(p, alumno, dossier, clave, envio)).resolves.toEqual({
    resultado: 'sin-guardar-local',
  });
});

it('reabre y edita un borrador sin red y lo envía tras reconectar, sin mostrarlo a otro usuario', async () => {
  const p = escenario();
  const cargar = (usuario = alumno) =>
    cargarContextoRegistro(p, usuario, '2026-10-01', '2026-10-31', fecha);
  expect((await cargar())?.local).toBe(false);
  await guardarBorrador(p.borradores, clave, {
    valores,
    huellaBase: null,
    guardadoEn: envio.ahora,
  });
  const listar = p.dossiers.listar.bind(p.dossiers);
  p.dossiers.listar = async () => {
    throw new SinConexionError();
  };
  expect((await cargar())?.local).toBe(true);
  expect((await leerBorrador(p.borradores, clave, validarValoresDia))?.valores).toEqual(valores);
  await expect(cargar(otroAlumno)).rejects.toThrow(SinConexionError);
  const editados = { ...valores, observaciones: 'Editado sin red' };
  await guardarBorrador(p.borradores, clave, {
    valores: editados,
    huellaBase: null,
    guardadoEn: envio.ahora,
  });
  p.dossiers.listar = listar;
  await expect(
    enviarDia(p, alumno, dossier, clave, { ...envio, valores: editados }),
  ).resolves.toMatchObject({ resultado: 'guardado' });
  expect(await leerBorrador(p.borradores, clave, validarValoresDia)).toBeNull();
});

it('no usa contexto local tras una denegación del servidor', async () => {
  const p = escenario();
  await cargarContextoRegistro(p, alumno, '2026-10-01', '2026-10-31', fecha);
  p.dossiers.listar = async () => {
    throw new Error('permission denied');
  };
  await expect(
    cargarContextoRegistro(p, alumno, '2026-10-01', '2026-10-31', fecha),
  ).rejects.toThrow('permission denied');
});

it('revalida el propietario y el periodo del dossier al enviar', async () => {
  const p = escenario();
  p.dossiers.dossiers = [crearDossier({ alumnoId: otroAlumno.id })];
  await expect(enviarDia(p, alumno, dossier, clave, envio)).rejects.toThrow('permiso');
  p.dossiers.dossiers = [crearDossier({ fechaFin: '2026-10-19' })];
  await expect(enviarDia(p, alumno, dossier, clave, envio)).rejects.toThrow('periodo');
});

it('rechaza uno de dos guardados concurrentes y conserva el primero', async () => {
  const p = escenario();
  const b = { ...valores, dossierId: dossier.id, fecha };
  const resultados = await Promise.allSettled([
    p.registros.guardar(b, null),
    p.registros.guardar({ ...b, observaciones: 'Otra sesión' }, null),
  ]);
  expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
  expect((await p.registros.obtenerPorFecha(dossier.id, fecha))?.observaciones).toBe('');
});

it('resolver un conflicto no permite pisar un cambio posterior y un reintento no vuelve a escribir', async () => {
  const p = escenario();
  const b = { ...valores, dossierId: dossier.id, fecha };
  const primero = await p.registros.guardar(b, null);
  const segundo = await p.registros.guardar(
    { ...b, observaciones: 'Segundo' },
    huellaRegistro(primero),
  );
  await expect(
    p.registros.guardar({ ...b, observaciones: 'Tercero' }, huellaRegistro(primero)),
  ).rejects.toThrow(ConflictoRegistroError);
  await expect(p.registros.guardar({ ...b, observaciones: 'Segundo' }, null)).resolves.toBe(
    segundo,
  );
});
