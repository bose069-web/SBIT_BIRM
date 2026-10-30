import { estadoEnvio, estadoMes } from '../estados-registro';

describe('estadoEnvio', () => {
  it.each([
    [{ hayBorrador: true, pendienteEnvio: true, enServidor: true }, 'Pendiente de enviar'],
    [
      { hayBorrador: true, pendienteEnvio: false, enServidor: true },
      'Borrador en este dispositivo',
    ],
    [{ hayBorrador: false, pendienteEnvio: false, enServidor: true }, 'Guardado en el servidor'],
  ])('%j → %s', (dia, texto) => {
    expect(estadoEnvio(dia)?.texto).toBe(texto);
  });

  it('sin nada apuntado no afirma nada', () => {
    expect(
      estadoEnvio({ hayBorrador: false, pendienteEnvio: false, enServidor: false }),
    ).toBeNull();
  });
});

describe('estadoMes', () => {
  it('distingue validado de pendiente y no afirma nada sin día guardado', () => {
    expect(estadoMes({ cerrado: true, enServidor: false })?.texto).toBe('Mes valorado');
    expect(estadoMes({ cerrado: false, enServidor: true })?.texto).toBe(
      'Mes pendiente de validación',
    );
    expect(estadoMes({ cerrado: false, enServidor: false })).toBeNull();
  });
});
