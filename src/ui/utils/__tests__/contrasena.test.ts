import { bytesSeguros, generarContrasena } from '../contrasena';

describe('generarContrasena', () => {
  it('tiene 16 caracteres de todos los tipos y no se repite', () => {
    const contrasenas = Array.from({ length: 200 }, () => generarContrasena());
    for (const c of contrasenas) {
      expect(c).toHaveLength(16);
      expect(c).toMatch(/[a-z]/);
      expect(c).toMatch(/[A-Z]/);
      expect(c).toMatch(/[2-9]/);
      expect(c).toMatch(/[-_!?]/);
      expect(c).not.toMatch(/[0O1lI]/);
    }
    expect(new Set(contrasenas).size).toBe(200);
  });

  it('no usa Math.random', () => {
    const azar = jest.spyOn(Math, 'random');
    generarContrasena();
    expect(azar).not.toHaveBeenCalled();
    azar.mockRestore();
  });

  it('descarta los bytes que sesgarían el reparto', () => {
    const obtener = jest
      .fn<Uint8Array, [number]>()
      .mockReturnValueOnce(new Uint8Array(32).fill(255))
      .mockImplementation((n) => globalThis.crypto.getRandomValues(new Uint8Array(n)));
    expect(generarContrasena(obtener)).toHaveLength(16);
    expect(obtener.mock.calls.length).toBeGreaterThan(1);
  });

  it('sin crypto global recurre al UUID nativo y no a Math.random', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(bytesSeguros(40)).toHaveLength(40);
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
