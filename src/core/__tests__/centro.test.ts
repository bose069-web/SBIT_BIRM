import {
  asignarProfe,
  darDeAltaEmpresa,
  firmarConvenio,
  incorporarAlumno,
  obtenerPanelCentro,
  quitarConvenio,
} from '../application/centro';
import type { Convenio, Empresa, Persona } from '../domain/centro';
import { SinPermisoError } from '../domain/errores';
import type { GestionCentroPort } from '../ports/gestion-centro-port';
import { generalitat, instituto, otroInstituto, profe } from '../__fixtures__/datos';

const persona = (p: Partial<Persona> & Pick<Persona, 'id' | 'nombre' | 'rol'>): Persona => ({
  email: `${p.id}@kampus.test`,
  centroId: 'c1',
  profeId: null,
  ...p,
});

const PAU = persona({ id: 'p1', nombre: 'Pau', rol: 'profe' });
const RUT = persona({ id: 'p9', nombre: 'Rut', rol: 'profe', centroId: 'c2' });
const ANA = persona({ id: 'a1', nombre: 'Ana', rol: 'alumno', profeId: 'p1' });
const BIEL = persona({ id: 'a2', nombre: 'Biel', rol: 'alumno' });
const NUEVA = persona({ id: 'n1', nombre: 'Nora', rol: 'alumno', centroId: null });

class CentrosFalsos implements GestionCentroPort {
  personas = [PAU, ANA, BIEL, NUEVA].map((p) => ({ ...p }));
  empresas: Empresa[] = [
    { id: 'e1', nombre: 'Zeta SL', cif: null },
    { id: 'e2', nombre: 'Alfa SL', cif: null },
  ];
  convenios: Convenio[] = [
    { centroId: 'c1', empresaId: 'e1', empresaNombre: 'Zeta SL', firmadoEn: null },
  ];
  async obtenerCentro(id: string) {
    return id === 'c1' ? { id, nombre: 'Institut' } : null;
  }
  async listarPersonas() {
    return this.personas;
  }
  async incorporarAlumno(id: string, centroId: string) {
    this.personas.find((p) => p.id === id)!.centroId = centroId;
  }
  async asignarProfe(id: string, profeId: string | null) {
    this.personas.find((p) => p.id === id)!.profeId = profeId;
  }
  async listarEmpresas() {
    return this.empresas;
  }
  async crearEmpresa(nombre: string, cif: string | null) {
    const e = { id: `e${this.empresas.length + 1}`, nombre, cif };
    this.empresas.push(e);
    return e;
  }
  async listarConvenios() {
    return this.convenios;
  }
  async crearConvenio(centroId: string, empresaId: string, firmadoEn: string | null) {
    this.convenios.push({ centroId, empresaId, empresaNombre: '', firmadoEn });
  }
  async eliminarConvenio(centroId: string, empresaId: string) {
    this.convenios = this.convenios.filter(
      (c) => !(c.centroId === centroId && c.empresaId === empresaId),
    );
  }
}

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
