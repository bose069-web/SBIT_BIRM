import { PreferenciasLocalStorage } from '../preferencias-local-storage';

function almacen() {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
}

describe('PreferenciasLocalStorage', () => {
  it('sin nada guardado no oculta nada', async () => {
    const p = new PreferenciasLocalStorage(almacen());
    expect(await p.leerAvisos('u1')).toEqual({ ocultarSecundarios: false });
  });

  it('recuerda la preferencia de cada usuario por separado', async () => {
    const p = new PreferenciasLocalStorage(almacen());
    await p.guardarAvisos('u1', { ocultarSecundarios: true });
    expect(await p.leerAvisos('u1')).toEqual({ ocultarSecundarios: true });
    expect(await p.leerAvisos('u2')).toEqual({ ocultarSecundarios: false });
  });

  it('lo corrupto o un almacén que falla cuentan como sin preferencia', async () => {
    const a = almacen();
    a.datos.set('kampus:preferencias-avisos:u1', '{no es json');
    a.datos.set('kampus:preferencias-avisos:u2', '{"ocultarSecundarios":"si"}');
    const p = new PreferenciasLocalStorage(a);
    expect(await p.leerAvisos('u1')).toEqual({ ocultarSecundarios: false });
    expect(await p.leerAvisos('u2')).toEqual({ ocultarSecundarios: false });
    const roto = new PreferenciasLocalStorage({
      ...a,
      getItem: () => {
        throw new Error('sin acceso');
      },
    });
    expect(await roto.leerAvisos('u1')).toEqual({ ocultarSecundarios: false });
  });
});
