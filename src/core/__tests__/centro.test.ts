import {
  asignarProfe,
  darDeAltaEmpresa,
  firmarConvenio,
  incorporarAlumno,
  obtenerPanelCentro,
  quitarConvenio,
} from '../application/centro';
import { SinPermisoError } from '../domain/errores';
import {
  ANA,
  BIEL,
  CentrosFalsos,
  generalitat,
  instituto,
  NUEVA,
  otroInstituto,
  PAU,
  profe,
  RUT,
} from '../__fixtures__/datos';

describe('panel del centro', () => {
  it('separa alumnos, profes y cuentas nuevas, y las empresas sin convenio', async () => {
    const panel = await obtenerPanelCentro(new CentrosFalsos(), instituto, 'c1');
    expect(panel.alumnos.map((p) => p.nombre)).toEqual(['Ana', 'Biel']);
    expect(panel.profes.map((p) => p.nombre)).toEqual(['Pau']);
    expect(panel.cuentasNuevas.map((p) => p.nombre)).toEqual(['Nora']);
    expect(panel.empresasSinConvenio.map((e) => e.nombre)).toEqual(['Alfa SL']);
  });

  it('lo ven su instituto y la generalitat; otro instituto o un profe no', async () => {
    await expect(obtenerPanelCentro(new CentrosFalsos(), generalitat, 'c1')).resolves.toBeDefined();
    for (const usuario of [otroInstituto, profe]) {
      await expect(obtenerPanelCentro(new CentrosFalsos(), usuario, 'c1')).rejects.toThrow(
        SinPermisoError,
      );
    }
  });
});

describe('asignar profe', () => {
  it('asigna y quita el profe de un alumno del centro', async () => {
    const port = new CentrosFalsos();
    await asignarProfe(port, instituto, BIEL, PAU);
    expect(port.personas.find((p) => p.id === 'a2')!.profeId).toBe('p1');
    await asignarProfe(port, instituto, ANA, null);
    expect(port.personas.find((p) => p.id === 'a1')!.profeId).toBeNull();
  });

  it('no deja un profe de otro centro, un no-alumno ni otro instituto', async () => {
    const port = new CentrosFalsos();
    await expect(asignarProfe(port, instituto, BIEL, RUT)).rejects.toThrow('mismo centro');
    await expect(asignarProfe(port, instituto, PAU, PAU)).rejects.toThrow('Solo se asigna');
    await expect(asignarProfe(port, otroInstituto, BIEL, PAU)).rejects.toThrow(SinPermisoError);
  });
});

describe('cuentas nuevas, empresas y convenios', () => {
  it('incorpora solo cuentas nuevas', async () => {
    const port = new CentrosFalsos();
    await incorporarAlumno(port, instituto, NUEVA, 'c1');
    expect(port.personas.find((p) => p.id === 'n1')!.centroId).toBe('c1');
    await expect(incorporarAlumno(port, instituto, BIEL, 'c1')).rejects.toThrow('cuentas nuevas');
  });

  it('da de alta empresas con nombre y firma y quita convenios', async () => {
    const port = new CentrosFalsos();
    await expect(darDeAltaEmpresa(port, instituto, ' ', '')).rejects.toThrow('nombre');
    await expect(darDeAltaEmpresa(port, profe, 'Beta SL', '')).rejects.toThrow(SinPermisoError);
    const beta = await darDeAltaEmpresa(port, instituto, ' Beta SL ', 'b123');
    expect(beta).toMatchObject({ nombre: 'Beta SL', cif: 'B123' });
    await firmarConvenio(port, instituto, 'c1', beta.id, '2026-10-27');
    expect(port.convenios).toHaveLength(2);
    await quitarConvenio(port, instituto, port.convenios[0]);
    expect(port.convenios.map((c) => c.empresaId)).toEqual([beta.id]);
    await expect(firmarConvenio(port, otroInstituto, 'c1', 'e2', null)).rejects.toThrow(
      SinPermisoError,
    );
  });
});
