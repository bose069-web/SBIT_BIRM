import { act, useEffect, useState, type ReactNode } from 'react';
import { container } from '@/config/container';
import { textoClaveBorrador } from '@/core/domain/borrador';
import {
  validarValoresDia,
  valoresDiaIguales,
  type ValoresDia,
} from '@/core/domain/registro-diario';
import { useBorrador } from '../use-borrador';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@/config/container', () => ({
  container: { borradores: { leer: jest.fn(), guardar: jest.fn(), borrar: jest.fn() } },
}));
// El preset de React Native redefine `window`, así que el DOM se monta aquí y no con un entorno jsdom.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JSDOM } = require('jsdom') as { JSDOM: new () => { window: { document: Document } } };
Object.assign(globalThis, { document: new JSDOM().window.document });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as {
  createRoot(elemento: HTMLElement): { render(nodo: ReactNode): void; unmount(): void };
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const vacio: ValoresDia = { tipo: 'trabajo', horas: [], observaciones: '' };
const clave = (usuarioId: string) => ({
  ambito: 'registro-dia',
  usuarioId,
  contexto: ['d1', '2026-10-20'],
});
let estado: ReturnType<typeof useBorrador<ValoresDia>>;
let editar: (v: ValoresDia) => void;
function Formulario({ usuarioId }: { usuarioId: string }) {
  const [valores, setValores] = useState(vacio);
  const resultado = useBorrador({
    clave: clave(usuarioId),
    valores,
    base: vacio,
    iguales: valoresDiaIguales,
    validar: validarValoresDia,
    huellaActual: null,
    onRecuperar: setValores,
  });
  useEffect(() => {
    editar = setValores;
    estado = resultado;
  }, [resultado]);
  return <span>{valores.observaciones}</span>;
}
let raiz: ReturnType<typeof createRoot>;
let nodo: HTMLDivElement;
let almacen: Map<string, string>;
beforeEach(() => {
  jest.useFakeTimers();
  almacen = new Map();
  jest.mocked(container.borradores.leer).mockImplementation(async (c) => almacen.get(c) ?? null);
  jest.mocked(container.borradores.guardar).mockImplementation(async (c, v) => {
    almacen.set(c, v);
  });
  jest.mocked(container.borradores.borrar).mockImplementation(async (c) => {
    almacen.delete(c);
  });
  nodo = document.createElement('div');
  raiz = createRoot(nodo);
});
afterEach(async () => {
  await act(async () => raiz.unmount());
  jest.useRealTimers();
});

it('recupera después de desmontar y no recupera datos de otro usuario', async () => {
  await act(async () => raiz.render(<Formulario usuarioId="a1" />));
  await act(async () => editar({ ...vacio, observaciones: 'Trabajo sin red' }));
  // Desmontar antes del debounce también debe conservar lo escrito.
  await act(async () => raiz.unmount());
  expect(almacen.has(textoClaveBorrador(clave('a1')))).toBe(true);
  raiz = createRoot(nodo);
  await act(async () => raiz.render(<Formulario usuarioId="a1" />));
  expect(nodo.textContent).toBe('Trabajo sin red');
  await act(async () => raiz.render(<Formulario key="a2" usuarioId="a2" />));
  expect(nodo.textContent).toBe('');
});

it('un fallo de persistencia elimina la confirmación y permite reintentar sin cambiar el texto', async () => {
  await act(async () => raiz.render(<Formulario usuarioId="a1" />));
  jest.mocked(container.borradores.guardar).mockRejectedValue(new Error('QuotaExceededError'));
  await act(async () => editar({ ...vacio, observaciones: 'No perder' }));
  await act(async () => {
    jest.advanceTimersByTime(700);
  });
  expect(estado.guardadoEn).toBeNull();
  expect(estado.fallo).toBe(true);
  expect(nodo.textContent).toBe('No perder');
  jest.mocked(container.borradores.guardar).mockImplementation(async (c, v) => {
    almacen.set(c, v);
  });
  await act(async () => {
    await estado.volcar();
  });
  expect(estado.guardadoEn).not.toBeNull();
  expect(estado.fallo).toBe(false);
  await act(async () => estado.marcarFallo());
  expect(estado.guardadoEn).toBeNull();
  expect(estado.pendienteEnvio).toBe(false);
});
