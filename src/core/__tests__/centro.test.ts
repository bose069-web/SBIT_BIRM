import {
  asignarProfe,
  crearCentro,
  GestionCentroError,
  listarCentros,
  darDeAltaEmpresa,
  firmarConvenio,
  incorporarAlumno,
  obtenerPanelCentro,
  quitarConvenio,
} from '../application/centro';
import { SinPermisoError } from '../domain/errores';
import {
  alumno,
  empresa,
  generalitat,
  instituto,
  otroInstituto,
  profe,
  ANA,
  BIEL,
  NUEVA,
  PAU,
  RUT,
  CentrosFalsos,
} from '../__fixtures__/datos';

describe('listar centros', () => {
  it('incluye centros sin alumnos ni dossiers y los ordena por nombre sin alterar el puerto', async () => {
    const port = new CentrosFalsos();
    port.centros = [
      { id: 'c2', nombre: 'Zeta', codigo: '08000002' },
      { id: 'c3', nombre: 'Alfa', codigo: null },
    ];

    await expect(listarCentros(port)).resolves.toEqual([
      { id: 'c3', nombre: 'Alfa', codigo: null },
      { id: 'c2', nombre: 'Zeta', codigo: '08000002' },
    ]);
    expect(port.centros.map((c) => c.id)).toEqual(['c2', 'c3']);
  });

  it('devuelve una lista vacía si todavía no hay centros', async () => {
    const port = new CentrosFalsos();
    port.centros = [];
    await expect(listarCentros(port)).resolves.toEqual([]);
  });

  it('propaga los errores del puerto', async () => {
    const port = new CentrosFalsos();
    const error = new Error('No se pueden consultar los centros');
    jest.spyOn(port, 'listarCentros').mockRejectedValueOnce(error);
    await expect(listarCentros(port)).rejects.toBe(error);
  });
});

describe('crear centros', () => {
  it('permite a la generalitat crear un centro, limpia espacios y conserva los ceros iniciales', async () => {
    const port = new CentrosFalsos();
    const centro = await crearCentro(port, generalitat, {
      nombre: '  Institut Nou  ',
      codigo: '  08000002  ',
    });

    expect(centro).toEqual({ id: 'c2', nombre: 'Institut Nou', codigo: '08000002' });
    await expect(listarCentros(port)).resolves.toContainEqual(centro);
    await expect(port.obtenerCentro(centro.id)).resolves.toEqual(centro);
  });

  it.each([alumno, empresa, profe, instituto])(
    'impide crear centros al rol $rol',
    async (usuario) => {
      const port = new CentrosFalsos();
      const crear = jest.spyOn(port, 'crearCentro');

      await expect(
        crearCentro(port, usuario, { nombre: 'Institut Nou', codigo: '08000002' }),
      ).rejects.toThrow(SinPermisoError);
      expect(crear).not.toHaveBeenCalled();
    },
  );

  it('comprueba el permiso antes de validar los datos', async () => {
    await expect(
      crearCentro(new CentrosFalsos(), instituto, { nombre: '', codigo: '' }),
    ).rejects.toThrow(SinPermisoError);
  });

  it.each(['', ' \n\t '])('rechaza un nombre vacío (%j) sin llamar al puerto', async (nombre) => {
    const port = new CentrosFalsos();
    const crear = jest.spyOn(port, 'crearCentro');

    await expect(crearCentro(port, generalitat, { nombre, codigo: '08000002' })).rejects.toThrow(
      GestionCentroError,
    );
    expect(crear).not.toHaveBeenCalled();
  });

  it.each(['', '0800000', '080000002', '0800000A', '0800 002', '０８０００００２'])(
    'rechaza el código inválido %j sin llamar al puerto',
    async (codigo) => {
      const port = new CentrosFalsos();
      const crear = jest.spyOn(port, 'crearCentro');

      await expect(
        crearCentro(port, generalitat, { nombre: 'Institut Nou', codigo }),
      ).rejects.toThrow(GestionCentroError);
      expect(crear).not.toHaveBeenCalled();
    },
  );

  it('propaga los errores de creación del puerto', async () => {
    const port = new CentrosFalsos();
    const error = new Error('Ya existe un centro con ese código');
    jest.spyOn(port, 'crearCentro').mockRejectedValueOnce(error);

    await expect(
      crearCentro(port, generalitat, { nombre: 'Institut Nou', codigo: '08000002' }),
    ).rejects.toBe(error);
  });
});

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
