import {
  cambiarEmail,
  cambiarNombre,
  guardarDatosPersonales,
  guardarIdioma,
  obtenerMiIdentidad,
} from '../application/perfil';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  DATOS_PERSONALES_VACIOS,
  enmascararDni,
  formatoTelefono,
  normalizarTelefono,
  telefonoValido,
  type DatosPersonales,
} from '../domain/perfil';
import type { PerfilPort } from '../ports/perfil-port';
import { alumno, empresa, generalitat, instituto, profe } from '../__fixtures__/datos';

class PerfilFalso implements PerfilPort {
  datos = { ...DATOS_PERSONALES_VACIOS };
  nombre = '';
  email = '';
  async obtener() {
    return this.datos;
  }
  async guardar(d: DatosPersonales) {
    this.datos = d;
    return d;
  }
  async cambiarNombre(nombre: string) {
    this.nombre = nombre;
  }
  async cambiarEmail(email: string) {
    this.email = email;
    return 'cambiado' as const;
  }
  async obtenerIdentidad() {
    return { dni: '12345678Z' };
  }
}

const datos = (cambios: Partial<DatosPersonales>) => ({ ...DATOS_PERSONALES_VACIOS, ...cambios });

describe('datos personales', () => {
  it('recorta textos y vacía los que no son de su rol', async () => {
    const perfil = new PerfilFalso();
    const guardado = await guardarDatosPersonales(
      perfil,
      alumno,
      datos({
        telefono: ' +34 600 111 222 ',
        emergenciaNombre: ' Madre ',
        cargo: 'Jefe',
      }),
    );
    expect(guardado).toMatchObject({
      telefono: '600111222',
      emergenciaNombre: 'Madre',
      cargo: null,
    });
    const deEmpresa = await guardarDatosPersonales(
      perfil,
      empresa,
      datos({ telefono: '700111222', cargo: ' CTO ', departamento: 'Info' }),
    );
    expect(deEmpresa).toMatchObject({ cargo: 'CTO', departamento: null });
  });

  it('rechaza teléfonos y textos no válidos', () => {
    expect(() =>
      guardarDatosPersonales(
        new PerfilFalso(),
        alumno,
        datos({ telefono: '600111222', emergenciaTelefono: '12ab' }),
      ),
    ).toThrow(DatosInvalidosError);
    expect(() =>
      guardarDatosPersonales(
        new PerfilFalso(),
        profe,
        datos({ telefono: '600111222', departamento: 'x'.repeat(121) }),
      ),
    ).toThrow(DatosInvalidosError);
  });

  it('teléfonos españoles: 9 cifras que empiezan por 6-9, con +34 opcional', () => {
    expect(normalizarTelefono('+34 600 111 222')).toBe('600111222');
    expect(normalizarTelefono('0034 912-345-678')).toBe('912345678');
    expect(normalizarTelefono('93.123.45.67')).toBe('931234567');
    expect(telefonoValido('500111222')).toBe(false);
    expect(telefonoValido('60011122')).toBe(false);
    expect(telefonoValido('+44 600 111 222')).toBe(false);
    expect(formatoTelefono('600111222')).toBe('600 111 222');
  });

  it('el teléfono es obligatorio, salvo al cambiar solo el idioma', async () => {
    expect(() => guardarDatosPersonales(new PerfilFalso(), alumno, datos({}))).toThrow(
      DatosInvalidosError,
    );
    const guardado = await guardarIdioma(new PerfilFalso(), alumno, datos({}), 'ca');
    expect(guardado.idioma).toBe('ca');
  });
});

describe('nombre', () => {
  it('profe y empresa cambian el suyo, limpio y con al menos 2 letras', async () => {
    const perfil = new PerfilFalso();
    expect(await cambiarNombre(perfil, profe, '  Ana   García ')).toBe('Ana García');
    expect(perfil.nombre).toBe('Ana García');
    await expect(cambiarNombre(perfil, empresa, ' a ')).rejects.toThrow(DatosInvalidosError);
  });

  it('el alumno no puede: lo gestiona su tutor', async () => {
    await expect(cambiarNombre(new PerfilFalso(), alumno, 'Otro Nombre')).rejects.toThrow(
      SinPermisoError,
    );
  });
});

describe('correo', () => {
  it('la empresa cambia el suyo: se limpia y va en minúsculas', async () => {
    const perfil = new PerfilFalso();
    expect(await cambiarEmail(perfil, empresa, '  Nueva@Empresa.TEST ')).toEqual({
      email: 'nueva@empresa.test',
      estado: 'cambiado',
    });
    expect(perfil.email).toBe('nueva@empresa.test');
  });

  it('rechaza lo que no es un correo', async () => {
    for (const email of ['sin arroba', 'a@b', 'dos@@kampus.test', '@kampus.test']) {
      await expect(cambiarEmail(new PerfilFalso(), empresa, email)).rejects.toThrow(
        DatosInvalidosError,
      );
    }
  });

  it('los demás no: su correo lo gestiona el centro', async () => {
    for (const usuario of [alumno, profe, instituto, generalitat]) {
      await expect(cambiarEmail(new PerfilFalso(), usuario, 'otro@kampus.test')).rejects.toThrow(
        SinPermisoError,
      );
    }
  });
});

describe('identidad', () => {
  it('el alumno consulta su DNI', async () => {
    expect(await obtenerMiIdentidad(new PerfilFalso(), alumno)).toEqual({ dni: '12345678Z' });
  });

  it('los demás roles no tienen DNI registrado', async () => {
    expect(await obtenerMiIdentidad(new PerfilFalso(), profe)).toEqual({ dni: null });
  });

  it('enmascara el DNI y el NIE dejando las dos primeras cifras y la letra', () => {
    expect(enmascararDni('12345678Z')).toBe('12****78Z');
    expect(enmascararDni('x1234567-l')).toBe('X1****67L');
  });
});
