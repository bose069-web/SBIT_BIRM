import type { SupabaseClient } from '@supabase/supabase-js';

import { ChatSupabase } from '../chat-supabase';

it('recarga al recibir cambios y reconectar, y retira el canal al terminar', () => {
  const avisar = jest.fn();
  const eventos: (() => void)[] = [];
  let estado: ((valor: string) => void) | undefined;
  const canal = { on: jest.fn(), subscribe: jest.fn() };
  canal.on.mockImplementation((_tipo: string, _filtro: unknown, escuchar: () => void) => {
    eventos.push(escuchar);
    return canal;
  });
  canal.subscribe.mockImplementation((escuchar: (valor: string) => void) => {
    estado = escuchar;
    return canal;
  });
  const cliente = { channel: jest.fn(() => canal), removeChannel: jest.fn() };
  const chat = new ChatSupabase(cliente as unknown as SupabaseClient);
  const cancelar = chat.suscribir(avisar);
  estado?.('SUBSCRIBED');
  eventos[0]();
  eventos[1]();
  estado?.('CHANNEL_ERROR');
  estado?.('SUBSCRIBED');
  expect(avisar).toHaveBeenCalledTimes(4);
  cancelar();
  expect(cliente.removeChannel).toHaveBeenCalledWith(canal);
});
