import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { enviarMensajeChat, marcarChatLeido, useChatEmpresa } from '@/ui/estado/chat-empresa';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import {
  conversacionesDe,
  hace,
  horaDe,
  mensajesDe,
  noLeidos,
  porRecientes,
  TEXTO_ROL_CHAT,
  type Conversacion,
  type MensajeChat,
} from '@/ui/utils/chat';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

/**
 * Chat de la empresa con los alumnos que tutela y con sus profes del centro. Se abre desde la
 * pestaña Chat o desde la bandeja de mensajes de Inicio (`?conversacion=<id>`).
 */
export function ChatEmpresa() {
  const usuario = useUsuario();
  const ancho = useWebAncha();
  const { conversacion } = useLocalSearchParams<{ conversacion?: string }>();
  const { datos, error, cargando, recargar } = useDatos(
    () => listarDossiers(container.dossiers),
    [usuario.id],
  );
  useRecargarAlVolver(recargar);
  const { mensajes, leidoHasta } = useChatEmpresa();
  // Al llegar desde la bandeja de Inicio (`?conversacion=<id>`) se abre ese hilo.
  const [elegida, setElegida] = useState<string | null>(conversacion ?? null);

  // Abrir el hilo quita el aviso de mensajes sin leer.
  useEffect(() => {
    if (elegida) marcarChatLeido(elegida);
  }, [elegida]);

  const conversaciones = porRecientes(conversacionesDe(datos ?? [], usuario.id), mensajes);
  const seleccionada = conversaciones.find((c) => c.id === elegida) ?? null;

  const lista = (
    <Tarjeta titulo="Conversaciones">
      {conversaciones.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay conversaciones: aparecerán tus alumnos y sus profes cuando el centro te
          asigne prácticas.
        </ThemedText>
      ) : (
        <View style={styles.lista}>
          {conversaciones.map((c) => (
            <FilaConversacion
              key={c.id}
              conversacion={c}
              mensajes={mensajes}
              leidoHasta={leidoHasta[c.id] ?? null}
              usuario={usuario}
              activa={c.id === elegida}
              onPress={() => setElegida(c.id)}
            />
          ))}
        </View>
      )}
    </Tarjeta>
  );

  const hilo = seleccionada ? (
    <Tarjeta
      titulo={seleccionada.titulo}
      accion={
        <ThemedText type="small" themeColor="textSecondary">
          {TEXTO_ROL_CHAT[seleccionada.rol]}
        </ThemedText>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {seleccionada.etiqueta}
      </ThemedText>
      <HiloConversacion usuario={usuario} conversacion={seleccionada} mensajes={mensajes} />
    </Tarjeta>
  ) : null;

  return (
    <Pantalla titulo="Chat" subtitulo="Habla con tus alumnos y con sus profes" amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {datos && conversaciones.length === 0 && !cargando ? (
        <EstadoVacio
          titulo="No tienes alumnos asignados"
          texto="Cuando el centro te ponga como tutor de empresa de un alumno, podrás hablar aquí con él y con su profe."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {conversaciones.length > 0 ? (
        ancho ? (
          <View style={styles.columnas}>
            <View style={styles.lateral}>{lista}</View>
            <View style={styles.principal}>
              {hilo ?? (
                <Tarjeta>
                  <ThemedText type="small" themeColor="textSecondary">
                    Elige una conversación para leer los mensajes.
                  </ThemedText>
                </Tarjeta>
              )}
            </View>
          </View>
        ) : seleccionada ? (
          <>
            <Boton
              texto="‹ Conversaciones"
              variante="secundario"
              onPress={() => setElegida(null)}
            />
            {hilo}
          </>
        ) : (
          lista
        )
      ) : null}
    </Pantalla>
  );
}

function FilaConversacion({
  conversacion,
  mensajes,
  leidoHasta,
  usuario,
  activa,
  onPress,
}: {
  conversacion: Conversacion;
  mensajes: MensajeChat[];
  leidoHasta: string | null;
  usuario: Usuario;
  activa: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const delHilo = mensajesDe(mensajes, conversacion.id);
  const ultimo = delHilo[delHilo.length - 1] ?? null;
  const nuevos = noLeidos(mensajes, conversacion.id, leidoHasta, usuario.id);
  const propio = ultimo?.autorId === usuario.id;
  const resumen = ultimo ? `${propio ? 'Tú: ' : ''}${ultimo.texto}` : 'Sin mensajes todavía';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir el chat con ${conversacion.titulo}${
        nuevos ? `, ${nuevos} sin leer` : ''
      }`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fila,
        {
          borderColor: activa ? theme.primary : theme.border,
          backgroundColor: pressed || activa ? theme.subtle : 'transparent',
        },
      ]}>
      <View style={styles.filaTexto}>
        <View style={styles.filaArriba}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
            {conversacion.titulo}
          </ThemedText>
          {ultimo ? (
            <ThemedText type="small" themeColor="textSecondary">
              {hace(ultimo.enviadoEn)}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {conversacion.etiqueta}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {resumen}
        </ThemedText>
      </View>
      {nuevos ? <Chip texto={`${nuevos} sin leer`} color="estadoPendiente" /> : null}
    </Pressable>
  );
}

function HiloConversacion({
  usuario,
  conversacion,
  mensajes,
}: {
  usuario: Usuario;
  conversacion: Conversacion;
  mensajes: MensajeChat[];
}) {
  const theme = useTheme();
  const [texto, setTexto] = useState('');
  const delHilo = mensajesDe(mensajes, conversacion.id);

  function enviar() {
    enviarMensajeChat(conversacion.id, usuario.id, usuario.nombre, texto);
    setTexto('');
  }

  return (
    <View style={styles.conversacion}>
      <View style={styles.burbujas}>
        {delHilo.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay mensajes. Escribe el primero.
          </ThemedText>
        ) : null}
        {delHilo.map((m) => {
          const mio = m.autorId === usuario.id;
          return (
            <View
              key={m.id}
              style={[
                styles.burbuja,
                mio
                  ? { alignSelf: 'flex-end', backgroundColor: theme.primary }
                  : { alignSelf: 'flex-start', backgroundColor: theme.subtle },
              ]}>
              {mio ? null : <ThemedText type="smallBold">{m.autorNombre}</ThemedText>}
              <ThemedText type="small" style={mio ? { color: theme.onPrimary } : undefined}>
                {m.texto}
              </ThemedText>
              <ThemedText
                type="small"
                style={[styles.hora, { color: mio ? theme.onPrimary : theme.textSecondary }]}>
                {horaDe(m.enviadoEn)}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <Campo
        etiqueta="Escribe un mensaje"
        multiline
        value={texto}
        onChangeText={setTexto}
        placeholder={`Mensaje para ${conversacion.titulo}`}
      />
      <Boton texto="Enviar" onPress={enviar} desactivado={!texto.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  lateral: { flex: 1, maxWidth: 380 },
  principal: { flex: 1.6 },
  lista: { gap: Spacing.two },
  fila: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    minHeight: 72,
  },
  filaTexto: { flex: 1, gap: Spacing.half },
  filaArriba: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  conversacion: { gap: Spacing.three },
  burbujas: { gap: Spacing.two },
  burbuja: { maxWidth: '85%', padding: Spacing.three, borderRadius: Radius.card, gap: 2 },
  hora: { fontSize: 11, lineHeight: 16 },
  flex: { flex: 1 },
});
