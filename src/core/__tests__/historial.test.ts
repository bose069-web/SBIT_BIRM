import { consultarHistorial, puedeVerHistorial } from '../application/historial';
import { HistorialNoDisponibleError, SinPermisoError } from '../domain/errores';
import type { EntradaHistorial } from '../domain/historial';
import type { HistorialPort } from '../ports/historial-port';
import {
  alumno,
  crearDossier,
  empresa,
  generalitat,
  instituto,
  otraEmpresa,
  otroInstituto,
  otroProfe,
  profe,
} from '../__fixtures__/datos';

const dossier = crearDossier();
const entrada = { id: '1' } as EntradaHistorial;
const puerto = (listar: HistorialPort['listar']): HistorialPort => ({ listar });

describe('historial', () => {
  it('lo ven los mismos que ven el dossier', () => {
    for (const u of [alumno, empresa, profe, instituto, generalitat]) {
      expect(puedeVerHistorial(u, dossier)).toBe(true);
    }
    for (const u of [otraEmpresa, otroProfe, otroInstituto]) {
      expect(puedeVerHistorial(u, dossier)).toBe(false);
    }
  });

  it('sin permiso ni siquiera consulta', async () => {
    const listar = jest.fn();
    await expect(consultarHistorial(puerto(listar), otraEmpresa, dossier)).rejects.toThrow(
      SinPermisoError,
    );
    expect(listar).not.toHaveBeenCalled();
  });

  it('devuelve las entradas', async () => {
    const consulta = await consultarHistorial(
      puerto(async () => [entrada]),
      alumno,
      dossier,
    );
    expect(consulta).toEqual({ disponible: true, entradas: [entrada] });
  });

  it('sin la tabla en la base dice que no está disponible, sin romper', async () => {
    const consulta = await consultarHistorial(
      puerto(async () => {
        throw new HistorialNoDisponibleError();
      }),
      alumno,
      dossier,
    );
    expect(consulta).toEqual({ disponible: false });
  });

  it('otro fallo no se hace pasar por "no disponible"', async () => {
    await expect(
      consultarHistorial(
        puerto(async () => {
          throw new Error('Failed to fetch');
        }),
        alumno,
        dossier,
      ),
    ).rejects.toThrow('Failed to fetch');
  });
});
