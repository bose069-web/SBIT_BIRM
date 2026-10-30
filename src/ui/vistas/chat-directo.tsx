import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { BottomTabInset, Radius, Spacing, TopTabInset } from '@/ui/theme/theme';
import {
  conversacionesDe,
  conversacionesDelAlumno,
  conversacionesDelProfesor,
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
 * Chat directo de empresa y alumno. Un hilo por persona que comparte un dossier.
 * En web ancha se muestran dos paneles; en móvil, la lista abre el hilo.
 */
export function ChatDirecto({ accion }: { accion?: ReactNode }) {
  const usuario = useUsuario();
  const ancha = useWebAncha();
  const esAlumno = usuario.rol === 'alumno';
  const { conversacion } = useLocalSearchParams<{ conversacion?: string }>();
  const { datos, error, cargando, recargar } = useDatos(
    () => listarDossiers(container.dossiers),
    [usuario.id],
  );
  useRecargarAlVolver(recargar);
  const chat = useChat(usuario);
  useRecargarAlVolver(chat.recargar);
  const { mensajes, leidoHasta, marcarLeido } = chat;
  // Al llegar desde la bandeja de Inicio (`?conversacion=<id>`) se abre ese hilo.
  const elegida = conversacion ?? null;
  const elegir = (id: string | null) => router.setParams({ conversacion: id ?? undefined });

  const contactos = esAlumno
    ? conversacionesDelAlumno(datos ?? [], usuario.id)
    : usuario.rol === 'profe'
      ? conversacionesDelProfesor(datos ?? [], usuario.id)
      : conversacionesDe(datos ?? [], usuario.id);
  const conversaciones = porRecientes(contactos, mensajes);
  const seleccionada = conversaciones.find((c) => c.id === elegida) ?? null;
  const seleccionadaId = seleccionada?.id;

  // Solo se marca como leído un contacto que figura en los dossiers del usuario.
  useEffect(() => {
    if (seleccionadaId) marcarLeido(seleccionadaId);
  }, [seleccionadaId, marcarLeido, mensajes.length]);

  if (!datos || conversaciones.length === 0) {
    return (
      <Pantalla titulo="Chat" accion={accion} compacta>
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
        {datos && !cargando ? (
          <EstadoVacio
            titulo={esAlumno ? 'No tienes tutores asignados' : 'No tienes alumnos asignados'}
            texto={
              esAlumno
                ? 'Cuando tu dossier tenga un tutor de empresa o un profe, podrás hablar aquí con ellos.'
                : 'Cuando el centro te ponga como tutor de empresa de un alumno, podrás hablar aquí con él y con su profe.'
            }
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
          onPress={() => elegir(c.id)}
        />
      ))}
    </View>
  );
  const aviso = chat.error ? <ErrorCarga texto={chat.error} onReintentar={chat.recargar} /> : null;

  if (ancha) {
    return (
      <Pantalla titulo="Chat" accion={accion} amplia compacta>
        {aviso}
        <DosPaneles lista={lista}>
          {seleccionada ? (
            <Hilo
              key={seleccionada.id}
              conversacion={seleccionada}
              mensajes={mensajes}
              usuario={usuario}
              onEnviar={chat.enviar}
            />
          ) : (
            <View style={styles.centrado}>
              <EstadoVacio
                titulo="Elige una conversación"
                texto={
                  esAlumno
                    ? 'Selecciona tu tutor de empresa o tu profe para leer los mensajes.'
                    : 'Selecciona un alumno o un profe de la lista para leer los mensajes.'
                }
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
          <View style={styles.acciones}>
            <Boton texto="‹ Conversaciones" variante="secundario" onPress={() => elegir(null)} />
            {accion}
          </View>
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
    <Pantalla titulo="Chat" accion={accion} compacta>
      {aviso}
      {lista}
    </Pantalla>
  );
}

function TarjetaMovil({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const alto = Math.max(320, height - TopTabInset - BottomTabInset - 180);
  return (
    <View
      style={[
        styles.tarjetaMovil,
        { height: alto, backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
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
}: {
  conversacion: Conversacion;
  mensajes: MensajeChat[];
  usuario: Usuario;
  onEnviar: Enviar;
}) {
  const theme = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const fotograma = useRef<number | null>(null);
  // Espera al siguiente dibujo: el compositor también cambia de alto al vaciarse.
  const bajarAlFinal = useCallback(() => {
    if (fotograma.current !== null) cancelAnimationFrame(fotograma.current);
    fotograma.current = requestAnimationFrame(() => {
      fotograma.current = null;
      scroll.current?.scrollToEnd({ animated: false });
    });
  }, []);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Adapta los mensajes directos al formato del componente compartido.
  const delHilo: MensajeLista[] = mensajesDe(mensajes, conversacion.id).map((m) => ({
    id: m.id,
    autorId: m.autorId,
    autorNombre: m.autorNombre,
    texto: m.texto,
    creadoEn: m.enviadoEn,
  }));
  const ultimo = delHilo[delHilo.length - 1] ?? null;

  useEffect(() => {
    bajarAlFinal();
    return () => {
      if (fotograma.current !== null) cancelAnimationFrame(fotograma.current);
    };
  }, [conversacion.id, ultimo?.id, bajarAlFinal]);

  async function enviar(texto: string): Promise<boolean> {
    setAviso(null);
    setEnviando(true);
    try {
      const fallo = await onEnviar(conversacion.id, texto);
      setAviso(fallo);
      if (!fallo) bajarAlFinal();
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.cuerpo}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={bajarAlFinal}
        onLayout={bajarAlFinal}>
        {cuerpo}
      </ScrollView>
      <View style={styles.pie} onLayout={bajarAlFinal}>
        {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
        <Compositor onEnviar={enviar} enviando={enviando} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0, minWidth: 0 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
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
    flexShrink: 0,
  },
  cuerpo: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, flexGrow: 1 },
  pie: { flexShrink: 0, gap: Spacing.two, padding: Spacing.three, paddingTop: 0 },
  tarjetaMovil: { borderWidth: 1, borderRadius: Radius.card, overflow: 'hidden' },
});
