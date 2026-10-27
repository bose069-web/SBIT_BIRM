import { act, type ReactNode } from 'react';

import { container } from '@/config/container';
import {
  alumno as mockAlumno,
  borrador,
  crearDossier,
  RegistrosFalsos,
} from '@/core/__fixtures__/datos';
import type { RegistroDiario } from '@/core/domain/registro-diario';
import { useDatos } from '@/ui/hooks/use-datos';
import * as fechas from '@/ui/utils/fechas';
import { PanelAlumno } from '@/ui/vistas/panel-alumno';
import { PanelEmpresa } from '@/ui/vistas/panel-empresa';
import { PanelProfe } from '@/ui/vistas/panel-profe';
import { VistaRegistroDia } from '@/ui/vistas/registro-dia';

// React DOM ya es una dependencia de la app. Solo sustituimos los controles nativos y el navegador.
interface Raiz {
  render(elemento: ReactNode): void;
  unmount(): void;
}
const { JSDOM } = jest.requireActual<{
  JSDOM: new (html: string) => { window: { document: Document; close(): void } };
}>('jsdom');
const navegador = new JSDOM('<!doctype html><html><body></body></html>');
Object.defineProperties(globalThis, {
  window: { value: navegador.window, configurable: true, writable: true },
  document: { value: navegador.window.document, configurable: true },
});
const { createRoot } = jest.requireActual<{
  createRoot(elemento: HTMLElement): Raiz;
}>('react-dom/client');

const mockFoco = { activo: true, oyentes: new Set<() => void>() };

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (efecto: () => void | (() => void)) => {
    const { useEffect, useState } = jest.requireActual<typeof import('react')>('react');
    const [version, setVersion] = useState(0);
    useEffect(() => {
      const avisar = () => setVersion((v) => v + 1);
      mockFoco.oyentes.add(avisar);
      return () => {
        mockFoco.oyentes.delete(avisar);
      };
    }, []);
    useEffect(() => {
      if (mockFoco.activo) return efecto();
    }, [efecto, version]);
  },
}));

jest.mock('@/config/container', () => ({
  container: {
    dossiers: { listar: jest.fn() },
    registros: { listar: jest.fn(), guardar: jest.fn(), eliminar: jest.fn() },
    valoraciones: { listarMensuales: jest.fn(), obtenerFinal: jest.fn() },
  },
}));
jest.mock('@/ui/hooks/use-sesion', () => ({ useUsuario: () => mockAlumno }));
jest.mock('@/ui/hooks/use-theme', () => ({
  useTheme: () => ({ primary: 'black', border: 'gray' }),
}));
jest.mock('@/ui/theme/theme', () => ({
  Spacing: { one: 4, two: 8, three: 12, four: 16, five: 20 },
  Radius: { control: 4 },
}));
jest.mock('react-native', () => ({
  StyleSheet: { create: (estilos: unknown) => estilos, hairlineWidth: 1 },
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pressable: ({ children, onPress }: { children: ReactNode; onPress: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
}));
jest.mock('@/ui/components/boton', () => ({
  Boton: ({
    texto,
    onPress,
    desactivado,
    cargando,
  }: {
    texto: string;
    onPress: () => void;
    desactivado?: boolean;
    cargando?: boolean;
  }) => (
    <button onClick={onPress} disabled={desactivado || cargando}>
      {texto}
    </button>
  ),
}));
jest.mock('@/ui/components/campo', () => ({
  Campo: ({
    etiqueta,
    value,
    onChangeText,
  }: {
    etiqueta: string;
    value: string;
    onChangeText: (texto: string) => void;
  }) => (
    <input aria-label={etiqueta} value={value} onChange={(e) => onChangeText(e.target.value)} />
  ),
}));
jest.mock('@/ui/components/selector', () => ({
  Selector: () => null,
}));
jest.mock('@/ui/components/chip', () => ({
  Chip: ({ texto }: { texto: string }) => <span>{texto}</span>,
}));
jest.mock('@/ui/components/mensaje', () => ({
  Mensaje: ({ texto }: { texto: string }) => <div role="alert">{texto}</div>,
}));
jest.mock('@/ui/components/pantalla', () => ({
  Pantalla: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
jest.mock('@/ui/components/tarjeta', () => ({
  Tarjeta: ({ titulo, children }: { titulo?: string; children: ReactNode }) => (
    <section>
      <h2>{titulo}</h2>
      {children}
    </section>
  ),
}));
jest.mock('@/ui/components/themed-text', () => ({
  ThemedText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
jest.mock('@/ui/components/barra-progreso', () => ({ BarraProgreso: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let elemento: HTMLDivElement;
let raiz: Raiz;
let registros: RegistrosFalsos;

beforeEach(() => {
  jest.resetAllMocks();
  mockFoco.activo = true;
  elemento = document.createElement('div');
  document.body.append(elemento);
  raiz = createRoot(elemento);
  registros = new RegistrosFalsos();
  jest.spyOn(fechas, 'hoyISO').mockReturnValue('2026-10-31');
  jest.mocked(container.dossiers.listar).mockResolvedValue([crearDossier()]);
  jest
    .mocked(container.registros.listar)
    .mockImplementation((...args) => registros.listar(...args));
  jest.mocked(container.registros.guardar).mockImplementation((b) => registros.guardar(b));
  jest.mocked(container.valoraciones.listarMensuales).mockResolvedValue([]);
  jest.mocked(container.valoraciones.obtenerFinal).mockResolvedValue(null);
});

afterAll(() => navegador.window.close());

afterEach(async () => {
  await act(async () => raiz.unmount());
  elemento.remove();
  jest.restoreAllMocks();
});

async function mostrar(contenido: ReactNode) {
  await act(async () => raiz.render(contenido));
}

async function pulsar(texto: string) {
  const boton = [...elemento.querySelectorAll('button')].find((b) => b.textContent === texto);
  expect(boton).toBeDefined();
  await act(async () => boton?.click());
}

async function cambiarFoco(activo: boolean) {
  await act(async () => {
    mockFoco.activo = activo;
    mockFoco.oyentes.forEach((avisar) => avisar());
  });
}

it('no permite sobrescribir un día mientras se carga otro mes ni si falla su consulta', async () => {
  await registros.guardar(
    borrador({ fecha: '2026-11-01', horas: [{ actividadId: 'act1', horas: 8 }] }),
  );
  await mostrar(<VistaRegistroDia />);
  let rechazar: (error: Error) => void = () => {};
  const pendiente = new Promise<RegistroDiario[]>((_resolver, fallo) => {
    rechazar = fallo;
  });
  jest.mocked(container.registros.listar).mockImplementationOnce(() => pendiente);

  await pulsar('›');
  expect(elemento.textContent).toContain('Cargando…');
  expect(elemento.querySelector('input')).toBeNull();
  expect(elemento.textContent).not.toContain('Guardar día');

  await act(async () => rechazar(new Error('No se puede cargar noviembre')));
  expect(elemento.querySelector('[role="alert"]')?.textContent).toBe(
    'No se puede cargar noviembre',
  );
  expect(elemento.querySelector('input')).toBeNull();
  expect(container.registros.guardar).not.toHaveBeenCalled();
  expect(registros.dias[0].horas[0].horas).toBe(8);

  await pulsar('Reintentar');
  expect(elemento.querySelector<HTMLInputElement>('[aria-label="Interfaces"]')?.value).toBe('8');
  expect(elemento.textContent).toContain('Guardar cambios');
});

it('recarga el resumen al volver a Inicio después de registrar horas', async () => {
  await mostrar(<PanelAlumno />);
  expect(elemento.textContent).toContain('0 h');
  await cambiarFoco(false);
  await registros.guardar(
    borrador({ fecha: '2026-10-31', horas: [{ actividadId: 'act1', horas: 8 }] }),
  );
  await cambiarFoco(true);
  expect(elemento.textContent).toContain('8 h');
  expect(elemento.textContent).toContain('2% completado');
});

it.each([PanelProfe, PanelEmpresa])(
  '%p identifica los dossiers por el nombre del alumno',
  async (Panel) => {
    jest
      .mocked(container.dossiers.listar)
      .mockResolvedValue([
        crearDossier({ alumnoNombre: 'Ana Pruebas' }),
        crearDossier({ id: 'd2', alumnoId: 'a2', alumnoNombre: 'Leo Pruebas' }),
      ]);
    await mostrar(<Panel />);
    expect([...elemento.querySelectorAll('h2')].map((titulo) => titulo.textContent)).toEqual([
      'Ana Pruebas',
      'Leo Pruebas',
    ]);
  },
);

it.each([PanelProfe, PanelEmpresa])(
  '%p muestra un fallo de seguimiento y permite reintentarlo',
  async (Panel) => {
    jest
      .mocked(container.valoraciones.listarMensuales)
      .mockRejectedValueOnce(new Error('Fallo de seguimiento'));
    await mostrar(<Panel />);
    expect(elemento.querySelector('[role="alert"]')?.textContent).toBe('Fallo de seguimiento');
    expect(elemento.textContent).not.toContain('Cargando…');
    expect(elemento.textContent).not.toContain('Guardar valoración');
    await pulsar('Reintentar');
    expect(elemento.querySelector('[role="alert"]')).toBeNull();
    expect(elemento.textContent).toContain('Guardar valoración');
  },
);

it('ignora una respuesta pendiente que llega después de salir y volver a la pantalla', async () => {
  let resolver: (dato: string) => void = () => {};
  const pendiente = new Promise<string>((exito) => {
    resolver = exito;
  });
  const cargar = jest.fn().mockReturnValueOnce(pendiente).mockResolvedValue('Respuesta nueva');
  function Consulta() {
    const { datos } = useDatos<string>(cargar, []);
    return <span>{datos}</span>;
  }
  await mostrar(<Consulta />);
  await cambiarFoco(false);
  await cambiarFoco(true);
  expect(elemento.textContent).toBe('Respuesta nueva');
  await act(async () => resolver('Respuesta antigua'));
  expect(elemento.textContent).toBe('Respuesta nueva');
});
