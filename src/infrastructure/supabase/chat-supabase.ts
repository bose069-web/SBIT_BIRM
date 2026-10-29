import type { SupabaseClient } from '@supabase/supabase-js';

import type { LeidoHasta, MensajeDirecto } from '@/core/domain/chat';
import type { ChatPort } from '@/core/ports/chat-port';

interface FilaMensaje {
  id: string;
  autor_id: string;
  destinatario_id: string;
  texto: string;
  enviado_en: string;
  autor: { nombre: string } | null;
}

const COLUMNAS =
  'id, autor_id, destinatario_id, texto, enviado_en, ' +
  // Dos FK a perfiles: hay que decir cuál es la del autor.
  'autor:perfiles!chat_mensajes_autor_id_fkey(nombre)';

function aMensaje(f: FilaMensaje): MensajeDirecto {
  return {
    id: f.id,
    autorId: f.autor_id,
    // La RLS puede ocultar un perfil: mejor un texto genérico que fallar.
    autorNombre: f.autor?.nombre ?? 'Usuario',
    destinatarioId: f.destinatario_id,
    texto: f.texto,
    enviadoEn: f.enviado_en,
  };
}

// RLS: cada uno ve lo que ha escrito o recibido y solo escribe a quien comparte un dossier.
export class ChatSupabase implements ChatPort {
  constructor(private readonly cliente: SupabaseClient) {}

  suscribir(alCambiar: () => void): () => void {
    const canal = this.cliente
      .channel(`chat-${Math.random().toString(36).slice(2)}`)
      // Las políticas RLS limitan los eventos al usuario autenticado.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensajes' },
        alCambiar,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_lecturas' }, alCambiar)
      .subscribe((estado) => {
        // Recupera también los mensajes enviados durante una desconexión.
        if (estado === 'SUBSCRIBED') alCambiar();
      });
    return () => {
      void this.cliente.removeChannel(canal);
    };
  }

  private async idActual(): Promise<string> {
    const { data } = await this.cliente.auth.getUser();
    if (!data.user) throw new Error('No hay sesión');
    return data.user.id;
  }

  async listar() {
    const { data, error } = await this.cliente
      .from('chat_mensajes')
      .select(COLUMNAS)
      .order('enviado_en')
      .returns<FilaMensaje[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(aMensaje);
  }

  async enviar(destinatarioId: string, texto: string) {
    const { data, error } = await this.cliente
      .from('chat_mensajes')
      .insert({ autor_id: await this.idActual(), destinatario_id: destinatarioId, texto })
      .select(COLUMNAS)
      .single<FilaMensaje>();
    if (error) throw new Error(error.message);
    return aMensaje(data);
  }

  async leidoHasta() {
    const { data, error } = await this.cliente
      .from('chat_lecturas')
      .select('otro_id, leido_hasta')
      .returns<{ otro_id: string; leido_hasta: string }[]>();
    if (error) throw new Error(error.message);
    const leido: LeidoHasta = {};
    for (const f of data ?? []) leido[f.otro_id] = f.leido_hasta;
    return leido;
  }

  async marcarLeido(otroId: string, hasta: string) {
    const { error } = await this.cliente
      .from('chat_lecturas')
      .upsert({ usuario_id: await this.idActual(), otro_id: otroId, leido_hasta: hasta });
    if (error) throw new Error(error.message);
  }
}
