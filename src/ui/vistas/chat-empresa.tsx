import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import {
  Avatar,
  Compositor,
  ListaMensajes,
  type MensajeChat as MensajeLista,
} from '@/ui/components/chat';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { ThemedText } from '@/ui/components/themed-text';
import { useChat } from '@/ui/estado/chat-empresa';
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

type Enviar = (otroId: string, texto: string) => Promise<string | null>;

/**
 * Chat de la empresa con los alumnos que tutela y con sus profes del centro. Se abre desde la
 * pestaña Chat o desde la bandeja de mensajes de Inicio (`?conversacion=<id>`). En la web ancha,
 * lista a la izquierda y conversación a la derecha; en estrecho, la lista abre el hilo.
 */
export function ChatEmpresa() {
  const usuario = useUsuario();
  const ancha = useWebAncha();
  const { conversacion } = useLocalSearchParams<{ conversacion?: string }>();
  const { datos, error, cargando, recargar } = useDatos(
    () => listarDossiers(container.dossiers),
    [usuario.id],
  );
  useRecargarAlVolver(recargar);
  const chat = useChat(usuario);
  const { mensajes, leidoHasta, marcarLeido } = chat;
  // Al llegar desde la bandeja de Inicio (`?conversacion=<id>`) se abre ese hilo.
  const [elegida, setElegida] = useState<string | null>(conversacion ?? null);

  // Abrir el hilo quita el aviso de mensajes sin leer.
  useEffect(() => {
    if (elegida) marcarLeido(elegida);
  }, [elegida, marcarLeido, mensajes.length]);

  const conversaciones = porRecientes(conversacionesDe(datos ?? [], usuario.id), mensajes);
  const seleccionada = conversaciones.find((c) => c.id === elegida) ?? null;

  if (!datos || conversaciones.length === 0) {
    return (
      <Pantalla titulo="Chat" compacta>
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
        {datos && !cargando ? (
          <EstadoVacio
            titulo="No tienes alumnos asignados"
            texto="Cuando el centro te ponga como tutor de empresa de un alumno, podrás hablar aquí con él y con su profe."
            accion={{ texto: 'Volver a mirar', onPress: recargar }}
          />
        ) : null}
      </Pantalla>
    );
  }

  const lista = (
    <View accessibilityRole="list" style={styles.filas}>
      {conversaciones.map((c) => (
        <FilaConversacion
          key={c.id}
          conversacion={c}
          mensajes={mensajes}
          leidoHasta={leidoHasta[c.id] ?? null}
          usuario={usuario}
          seleccionada={c.id === elegida}
          onPress={() => setElegida(c.id)}
        />
      ))}
    </View>
  );
  const aviso = chat.error ? <ErrorCarga texto={chat.error} onReintentar={chat.recargar} /> : null;

  if (ancha) {
    return (
      <Pantalla titulo="Chat" amplia compacta>
        {aviso}
        <DosPaneles lista={lista}>
          {seleccionada ? (
            <Hilo
              key={seleccionada.id}
              conversacion={seleccionada}
              mensajes={mensajes}
              usuario={usuario}
              onEnviar={chat.enviar}
              conScroll
            />
          ) : (
            <View style={styles.centrado}>
              <EstadoVacio
                titulo="Elige una conversación"
                texto="Selecciona un alumno o un profe de la lista para leer los mensajes."
              />
            </View>
          )}
        </DosPaneles>
      </Pantalla>
    );
  }

  if (seleccionada) {
    return (
      <Pantalla
        titulo="Conversación"
        compacta
        accion={
          <Boton texto="‹ Conversaciones" variante="secundario" onPress={() => setElegida(null)} />
        }>
        {aviso}
        <TarjetaMovil>
          <Hilo
            key={seleccionada.id}
            conversacion={seleccionada}
            mensajes={mensajes}
            usuario={usuario}
            onEnviar={chat.enviar}
          />
        </TarjetaMovil>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo="Chat" compacta>
      {aviso}
      {lista}
    </Pantalla>
  );
}

function TarjetaMovil({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.tarjetaMovil, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

function DosPaneles({ lista, children }: { lista: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  // Alto fijo: lista y conversación tienen su propio scroll, el compositor queda siempre a mano.
  const alto = Math.max(520, height - 260);
  return (
    <View
      style={[
        styles.paneles,
        { height: alto, borderColor: theme.border, backgroundColor: theme.surface },
      ]}>
      <ScrollView
        style={[styles.panelLista, { borderRightColor: theme.border }]}
        contentContainerStyle={styles.contenidoPanelLista}>
        {lista}
      </ScrollView>
      <View style={[styles.flex, { backgroundColor: theme.background }]}>{children}</View>
    </View>
  );
}

function FilaConversacion({
  conversacion,
  mensajes,
  leidoHasta,
  usuario,
  seleccionada,
  onPress,
}: {
  conversacion: Conversacion;
  mensajes: MensajeChat[];
  leidoHasta: string | null;
  usuario: Usuario;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const delHilo = mensajesDe(mensajes, conversacion.id);
  const ultimo = delHilo[delHilo.length - 1] ?? null;
  const nuevos = noLeidos(mensajes, conversacion.id, leidoHasta, usuario.id);
  const propio = ultimo?.autorId === usuario.id;
  const vistaPrevia = ultimo ? `${propio ? 'Tú: ' : ''}${ultimo.texto}` : 'Sin mensajes todavía';
  const cuando = ultimo ? hace(ultimo.enviadoEn) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionada }}
      accessibilityLabel={`${conversacion.titulo}, ${TEXTO_ROL_CHAT[conversacion.rol]}. ${vistaPrevia}${
        cuando ? `. ${cuando}` : ''
      }${nuevos ? `. ${nuevos} sin leer` : ''}`}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.fila,
        {
          backgroundColor: seleccionada
            ? theme.primarySuave
            : pressed || hovered
              ? theme.subtle
              : 'transparent',
        },
      ]}>
      <Avatar nombre={conversacion.titulo} />
      <View style={styles.textoFila}>
        <View style={styles.lineaFila}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
            {conversacion.titulo}
          </ThemedText>
          {cuando ? (
            <ThemedText
              type="small"
              themeColor={nuevos ? 'primary' : 'textSecondary'}
              style={styles.meta}>
              {cuando}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.lineaFila}>
          <ThemedText
            type="small"
            themeColor={nuevos ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}>
            {vistaPrevia}
          </ThemedText>
          {nuevos ? (
            <View style={[styles.insignia, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={[styles.meta, { color: theme.onPrimary }]}>
                {nuevos > 99 ? '99+' : nuevos}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
          {TEXTO_ROL_CHAT[conversacion.rol]} · {conversacion.etiqueta}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Cabecera, mensajes y compositor de un hilo. */
function Hilo({
  conversacion,
  mensajes,
  usuario,
  onEnviar,
  conScroll = false,
}: {
  conversacion: Conversacion;
  mensajes: MensajeChat[];
  usuario: Usuario;
  onEnviar: Enviar;
  conScroll?: boolean;
}) {
  const theme = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // ListaMensajes pinta su propio formato: se adapta aquí el del chat de la empresa.
  const delHilo: MensajeLista[] = mensajesDe(mensajes, conversacion.id).map((m) => ({
    id: m.id,
    autorId: m.autorId,
    autorNombre: m.autorNombre,
    texto: m.texto,
    creadoEn: m.enviadoEn,
  }));
  const ultimo = delHilo[delHilo.length - 1] ?? null;

  async function enviar(texto: string): Promise<boolean> {
    setAviso(null);
    setEnviando(true);
    try {
      const fallo = await onEnviar(conversacion.id, texto);
      setAviso(fallo);
      return !fallo;
    } finally {
      setEnviando(false);
    }
  }

  const cuerpo =
    delHilo.length === 0 ? (
      <View style={styles.centrado}>
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay mensajes. Escribe el primero.
        </ThemedText>
      </View>
    ) : (
      <ListaMensajes mensajes={delHilo} yoId={usuario.id} />
    );

  return (
    <View style={conScroll ? styles.flex : undefined}>
      <View style={[styles.cabecera, { borderBottomColor: theme.border }]}>
        <Avatar nombre={conversacion.titulo} />
        <View style={styles.textoFila}>
          <ThemedText type="smallBold" accessibilityRole="header" numberOfLines={1}>
            {conversacion.titulo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {TEXTO_ROL_CHAT[conversacion.rol]} · {conversacion.etiqueta}
          </ThemedText>
        </View>
        {ultimo ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            Último {horaDe(ultimo.creadoEn)}
          </ThemedText>
        ) : null}
      </View>
      {conScroll ? (
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.cuerpo}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {cuerpo}
        </ScrollView>
      ) : (
        <View style={styles.cuerpo}>{cuerpo}</View>
      )}
      <View style={styles.pie}>
        {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
        <Compositor onEnviar={enviar} enviando={enviando} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filas: { gap: Spacing.half },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.button,
    minHeight: 64,
  },
  textoFila: { flex: 1, gap: 1 },
  lineaFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  meta: { fontSize: 12, lineHeight: 16 },
  insignia: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing.one + 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paneles: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  panelLista: { width: 360, flexGrow: 0, borderRightWidth: 1 },
  contenidoPanelLista: { padding: Spacing.two },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  cuerpo: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, flexGrow: 1 },
  pie: { gap: Spacing.two, padding: Spacing.three, paddingTop: 0 },
  tarjetaMovil: { borderWidth: 1, borderRadius: Radius.card, overflow: 'hidden' },
});
