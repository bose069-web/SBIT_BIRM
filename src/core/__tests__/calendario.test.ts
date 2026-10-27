import { agendaDelMes, crearEvento, limitesMes, listarEventosMes } from '../application/calendario';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  alumno,
  crearDossier,
  EventosFalsos,
  generalitat,
  instituto,
  otroProfe,
  profe,
} from '../__fixtures__/datos';

const dossier = crearDossier();
const general = {
  dossierId: null,
  titulo: 'Festivo',
  fecha: '2026-12-08',
  tipo: 'festivo' as const,
};
const delDossier = { ...general, dossierId: 'd1', titulo: 'Visita', tipo: 'reunion' as const };

describe('limites del mes', () => {
  it('sabe cuántos días tiene cada mes', () => {
    expect(limitesMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(limitesMes('2028-02').hasta).toBe('2028-02-29');
    expect(limitesMes('2026-12').hasta).toBe('2026-12-31');
  });
});

describe('crear eventos', () => {
  it('los generales solo instituto y generalitat', async () => {
    for (const u of [instituto, generalitat]) {
      await expect(crearEvento(new EventosFalsos(), u, general)).resolves.toMatchObject(general);
    }
    for (const u of [profe, alumno]) {
      expect(() => crearEvento(new EventosFalsos(), u, general)).toThrow(SinPermisoError);
    }
  });

  it('los de un dossier quien lo gestiona', async () => {
    await expect(
      crearEvento(new EventosFalsos(), profe, delDossier, dossier),
    ).resolves.toBeTruthy();
    expect(() => crearEvento(new EventosFalsos(), otroProfe, delDossier, dossier)).toThrow(
      SinPermisoError,
    );
    expect(() => crearEvento(new EventosFalsos(), profe, delDossier)).toThrow(SinPermisoError);
  });

  it('valida título y fecha', () => {
    expect(() => crearEvento(new EventosFalsos(), instituto, { ...general, titulo: '' })).toThrow(
      DatosInvalidosError,
    );
    expect(() =>
      crearEvento(new EventosFalsos(), instituto, { ...general, fecha: 'mañana' }),
    ).toThrow(DatosInvalidosError);
  });
});

describe('agenda', () => {
  it('lista el mes y agrupa eventos y tareas por día', async () => {
    const eventos = new EventosFalsos();
    await eventos.crear(general);
    await eventos.crear({ ...general, fecha: '2027-01-06' });
    const mes = await listarEventosMes(eventos, '2026-12');
    expect(mes).toHaveLength(1);
    const agenda = agendaDelMes('2026-12', mes, [
      { id: 't1', titulo: 'Memoria', fechaLimite: '2026-12-08', completada: false },
      { id: 't2', titulo: 'Otra', fechaLimite: null, completada: false },
    ]);
    expect([...agenda.keys()]).toEqual(['2026-12-08']);
    expect(agenda.get('2026-12-08')).toMatchObject({ eventos: [general], tareas: [{ id: 't1' }] });
  });
});
