import { cambiarNombre, guardarDatosPersonales } from '../application/perfil';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { DATOS_PERSONALES_VACIOS, telefonoValido, type DatosPersonales } from '../domain/perfil';
import type { PerfilPort } from '../ports/perfil-port';
import { alumno, empresa, profe } from '../__fixtures__/datos';

class PerfilFalso implements PerfilPort {
  datos = { ...DATOS_PERSONALES_VACIOS };
  nombre = '';
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
}

const datos = (cambios: Partial<DatosPersonales>) => ({ ...DATOS_PERSONALES_VACIOS, ...cambios });

describe('datos personales', () => {
  it('recorta textos y vacía los que no son de su rol', async () => {
    const perfil = new PerfilFalso();
    const guardado = await guardarDatosPersonales(
      perfil,
      alumno,
      datos({
        telefono: ' 600 111 222 ',
        emergenciaNombre: ' Madre ',
        cargo: 'Jefe',
      }),
    );
    expect(guardado).toMatchObject({
      telefono: '600 111 222',
      emergenciaNombre: 'Madre',
      cargo: null,
    });
    const deEmpresa = await guardarDatosPersonales(
      perfil,
      empresa,
      datos({ cargo: ' CTO ', departamento: 'Info' }),
    );
    expect(deEmpresa).toMatchObject({ cargo: 'CTO', departamento: null });
  });

  it('rechaza teléfonos y textos no válidos', () => {
    expect(() =>
      guardarDatosPersonales(new PerfilFalso(), alumno, datos({ emergenciaTelefono: '12ab' })),
    ).toThrow(DatosInvalidosError);
    expect(() =>
      guardarDatosPersonales(new PerfilFalso(), profe, datos({ departamento: 'x'.repeat(121) })),
    ).toThrow(DatosInvalidosError);
  });

  it('teléfonos: 9 a 15 cifras con + opcional', () => {
    expect(telefonoValido('+34 600 111 222')).toBe(true);
    expect(telefonoValido('93 123 45 67')).toBe(true);
    expect(telefonoValido('12345')).toBe(false);
    expect(telefonoValido('600-111-222')).toBe(false);
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
