import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';

import {
  enviarMensaje,
  buscarIncidencia,
  listarMensajes,
  obtenerBandeja,
} from '@/core/application/incidencias';
import { atiendeIncidencia, type Incidencia } from '@/core/domain/incidencia';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import {
  Avatar,
  Compositor,
  cuandoCorto,
  ListaMensajes,
  type MensajeChat,
} from '@/ui/components/chat';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';

import { ChatDirecto } from './chat-directo';
import { ChatEmpresa } from './chat-empresa';
import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';
import {
  Atender,
  COLOR_ESTADO,
  NuevaIncidencia,
  TEXTO_CATEGORIA,
  TEXTO_ESTADO,
  TEXTO_PRIORIDAD,
} from './incidencias';

/** La empresa y el alumno tienen chat directo; el alumno conserva también sus incidencias. */
export function VistaChat() {
  const usuario = useUsuario();
  if (usuario.rol === 'empresa') return <ChatEmpresa />;
  if (usuario.rol === 'alumno' || usuario.rol === 'profe') return <ChatConIncidencias />;
  return <ChatIncidencias />;
}

function ChatConIncidencias() {
  const { incidencia } = useLocalSearchParams<{ incidencia?: string }>();
  const [verIncidencias, setVerIncidencias] = useState(false);
  if (incidencia || verIncidencias) {
    return (
      <ChatIncidencias
        accion={
          <Boton
            texto="Mensajes directos"
            variante="secundario"
            onPress={() => {
              setVerIncidencias(false);
              router.setParams({ incidencia: undefined });
            }}
          />
        }
      />
    );
  }
  return (
    <ChatDirecto
      accion={
        <Boton texto="Incidencias" variante="secundario" onPress={() => setVerIncidencias(true)} />
      }
    />
  );
}

function ChatIncidencias({ accion }: { accion?: ReactNode }) {
  const ancha = useWebAncha();
  const { incidencia } = useLocalSearchParams<{ incidencia?: string }>();
  const lista = useListaConversaciones();

  if (ancha) {
    return (
      <Pantalla titulo="Chat" accion={accion} amplia compacta>
        <DosPaneles lista={lista} abierta={incidencia ?? null} />
      </Pantalla>
    );
  }
  if (incidencia) {
    return (
      <ConversacionMovil
        key={incidencia}
        id={incidencia}
        onCambio={lista.recargar}
        accion={accion}
      />
    );
  }
  return (
    <Pantalla titulo="Chat" accion={accion} compacta>
      <ListaConversaciones lista={lista} abierta={null} onAbrir={abrirEnPantalla} />
    </Pantalla>
  );
}

const abrirEnPantalla = (id: string) =>
  router.push({ pathname: '/chat', params: { incidencia: id } });
const abrirEnPanel = (id: string) => router.setParams({ incidencia: id });

interface Conversacion {
  incidencia: Incidencia;
  ultimo: MensajeChat | null;
  /** Grupo de la bandeja, para el texto bajo el título. */
  grupo: string;
}

/** Bandeja de incidencias con el último mensaje de cada una, de la más reciente a la más antigua. */
function useListaConversaciones() {
  const usuario = useUsuario();
  const resultado = useDatos(async () => {
    const bandeja = await obtenerBandeja(container.incidencias, usuario);
    const grupos: [string, Incidencia[]][] = [
      ['Por atender', bandeja.porAtender],
      ['De mis alumnos', bandeja.deMisAlumnos],
      ['Abierta por mí', bandeja.mias],
    ];
    const vistas = new Set<string>();
    const todas = grupos.flatMap(([grupo, lista]) =>
      lista.filter((i) => !vistas.has(i.id) && vistas.add(i.id)).map((i) => ({ grupo, i })),
    );
    // No hay un caso de uso para el último mensaje: se pide la conversación de cada una.
    const conversaciones: Conversacion[] = await Promise.all(
      todas.map(async ({ grupo, i }) => {
        const mensajes = await listarMensajes(container.incidencias, usuario, i).catch(() => []);
        return { incidencia: i, grupo, ultimo: mensajes[mensajes.length - 1] ?? null };
      }),
    );
    const fecha = (c: Conversacion) => c.ultimo?.creadoEn ?? c.incidencia.creadaEn;
    return {
      conversaciones: conversaciones.sort((a, b) => fecha(b).localeCompare(fecha(a))),
      pendientes: bandeja.pendientes,
    };
  }, [usuario.id]);
  useRecargarAlVolver(resultado.recargar);
  return resultado;
}

type Lista = ReturnType<typeof useListaConversaciones>;

function ListaConversaciones({
  lista,
  abierta,
  onAbrir,
}: {
  lista: Lista;
  abierta: string | null;
  onAbrir: (id: string) => void;
}) {
  const { datos, error, cargando, recargar } = lista;
  const nueva = <NuevaIncidencia onCreada={recargar} onAbrir={onAbrir} />;
  if (!datos) {
    return (
      <View style={styles.columnaLista}>
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoLista /> : null}
      </View>
    );
  }
  return (
    <View style={styles.columnaLista}>
      {datos.pendientes ? (
        <View style={styles.resumen}>
          <Chip texto={`${datos.pendientes} por atender`} color="estadoPendiente" />
        </View>
      ) : null}
      {datos.conversaciones.length === 0 ? (
        <EstadoVacio
          titulo="Sin conversaciones"
          texto="Si algo no va bien en las prácticas, con la empresa o con la app, abre una incidencia y hablad aquí."
        />
      ) : (
        <View accessibilityRole="list" style={styles.filas}>
          {datos.conversaciones.map((c) => (
            <FilaConversacion
              key={c.incidencia.id}
              conversacion={c}
              seleccionada={c.incidencia.id === abierta}
              onPress={() => onAbrir(c.incidencia.id)}
            />
          ))}
        </View>
      )}
      {nueva}
    </View>
  );
}

function FilaConversacion({
  conversacion: { incidencia: i, ultimo, grupo },
  seleccionada,
  onPress,
}: {
  conversacion: Conversacion;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const usuario = useUsuario();
  const autorUltimo = ultimo
    ? ultimo.autorId === usuario.id
      ? 'Tú'
      : (ultimo.autorNombre ?? 'Alguien')
    : null;
  const vistaPrevia = ultimo ? `${autorUltimo}: ${ultimo.texto}` : i.descripcion;
  const cuando = cuandoCorto(ultimo?.creadoEn ?? i.creadaEn);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionada }}
      accessibilityLabel={`${i.titulo}. ${TEXTO_ESTADO[i.estado]}. ${grupo}. Último: ${vistaPrevia}. ${cuando}`}
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
      <Avatar nombre={i.creadaPorNombre} />
      <View style={styles.textoFila}>
        <View style={styles.lineaFila}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
            {i.titulo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.cuando}>
            {cuando}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {vistaPrevia}
        </ThemedText>
        <View style={styles.lineaFila}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={[styles.flex, styles.meta]}>
            {i.creadaPorNombre ?? 'Alguien'} · {TEXTO_CATEGORIA[i.categoria]}
            {i.escalada ? ' · escalada' : ''}
          </ThemedText>
          <EstadoPunto incidencia={i} />
        </View>
      </View>
    </Pressable>
  );
}

function EstadoPunto({ incidencia }: { incidencia: Incidencia }) {
  const theme = useTheme();
  return (
    <View style={styles.estado}>
      <View style={[styles.punto, { backgroundColor: theme[COLOR_ESTADO[incidencia.estado]] }]} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
        {TEXTO_ESTADO[incidencia.estado]}
      </ThemedText>
    </View>
  );
}

function EsqueletoLista() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando conversaciones"
      style={styles.filas}>
      {[0, 1, 2, 3].map((n) => (
        <View key={n} style={styles.fila}>
          <View style={[styles.avatarFantasma, { backgroundColor: theme.subtle }]} />
          <View style={styles.textoFila}>
            <View style={[styles.barra, { width: '60%', backgroundColor: theme.subtle }]} />
            <View style={[styles.barra, { width: '85%', backgroundColor: theme.subtle }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function DosPaneles({ lista, abierta }: { lista: Lista; abierta: string | null }) {
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
        <ListaConversaciones lista={lista} abierta={abierta} onAbrir={abrirEnPanel} />
      </ScrollView>
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        {abierta ? (
          <PanelConversacion key={abierta} id={abierta} onCambio={lista.recargar} />
        ) : (
          <View style={styles.centrado}>
            <EstadoVacio
              titulo="Elige una conversación"
              texto="Selecciona una incidencia de la lista para leerla y responder."
            />
          </View>
        )}
      </View>
    </View>
  );
}

/** Carga una incidencia con sus mensajes y envía los nuevos. */
function useConversacion(id: string, onCambio: () => void) {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const incidencia = await buscarIncidencia(container.incidencias, id);
    if (!incidencia) return null;
    const mensajes = await listarMensajes(container.incidencias, usuario, incidencia);
    return { incidencia, mensajes };
  }, [id]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(texto: string): Promise<boolean> {
    if (!datos) return false;
    setAviso(null);
    setEnviando(true);
    try {
      await enviarMensaje(container.incidencias, usuario, datos.incidencia, texto);
      recargar();
      onCambio();
      return true;
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  // La descripción abre la conversación, como primer mensaje de quien la abrió.
  const mensajes: MensajeChat[] = datos
    ? [
        {
          id: `descripcion-${datos.incidencia.id}`,
          autorId: datos.incidencia.creadaPor,
          autorNombre: datos.incidencia.creadaPorNombre,
          texto: datos.incidencia.descripcion,
          creadoEn: datos.incidencia.creadaEn,
        },
        ...datos.mensajes,
      ]
    : [];
  return { datos, error, cargando, recargar, mensajes, enviar, enviando, aviso };
}

function CabeceraConversacion({
  incidencia: i,
  onCambio,
}: {
  incidencia: Incidencia;
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [detalles, setDetalles] = useState(false);
  const atiende = atiendeIncidencia(usuario, i);
  return (
    <View style={[styles.cabecera, { borderBottomColor: theme.border }]}>
      <View style={styles.lineaFila}>
        <Avatar nombre={i.creadaPorNombre} />
        <View style={styles.textoFila}>
          <ThemedText type="smallBold" accessibilityRole="header" numberOfLines={2}>
            {i.titulo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {i.creadaPorNombre ?? 'Alguien'} · {TEXTO_CATEGORIA[i.categoria]}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detalles }}
          accessibilityLabel={detalles ? 'Ocultar detalles' : 'Ver detalles'}
          onPress={() => setDetalles((d) => !d)}
          style={({ pressed }) => [
            styles.botonDetalles,
            { borderColor: theme.border, backgroundColor: pressed ? theme.subtle : theme.surface },
          ]}>
          <ThemedText type="small">{detalles ? 'Ocultar' : 'Detalles'}</ThemedText>
        </Pressable>
      </View>
      <View style={styles.chips}>
        <Chip texto={TEXTO_ESTADO[i.estado]} color={COLOR_ESTADO[i.estado]} />
        <Chip texto={TEXTO_PRIORIDAD[i.prioridad]} />
        {i.escalada ? <Chip texto="Escalada a la Generalitat" /> : null}
      </View>
      {detalles ? (
        <View style={styles.detalles}>
          {i.respuesta ? (
            <View style={[styles.respuesta, { backgroundColor: theme.subtle }]}>
              <ThemedText type="smallBold">Respuesta</ThemedText>
              <ThemedText type="small">{i.respuesta}</ThemedText>
            </View>
          ) : null}
          {atiende ? <Atender incidencia={i} onCambio={onCambio} /> : null}
          {!i.respuesta && !atiende ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no hay respuesta de quien la atiende.
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SinConversacion({
  error,
  cargando,
  onReintentar,
}: {
  error: string | null;
  cargando: boolean;
  onReintentar: () => void;
}) {
  if (error) return <ErrorCarga texto={error} onReintentar={onReintentar} />;
  if (cargando) return <EsqueletoPanel tarjetas={2} />;
  return <EstadoVacio titulo="No se encuentra" texto="Puede que se haya borrado." />;
}

/** Conversación abierta en el panel derecho de la web ancha. */
function PanelConversacion({ id, onCambio }: { id: string; onCambio: () => void }) {
  const usuario = useUsuario();
  const c = useConversacion(id, onCambio);
  const scroll = useRef<ScrollViewInstance>(null);
  if (!c.datos) {
    return (
      <View style={styles.cuerpo}>
        <SinConversacion error={c.error} cargando={c.cargando} onReintentar={c.recargar} />
      </View>
    );
  }
  const alCambiar = () => {
    c.recargar();
    onCambio();
  };
  return (
    <View style={styles.flex}>
      <CabeceraConversacion incidencia={c.datos.incidencia} onCambio={alCambiar} />
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.cuerpo}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <ListaMensajes mensajes={c.mensajes} yoId={usuario.id} />
      </ScrollView>
      <View style={styles.pie}>
        {c.aviso ? <Mensaje tipo="error" texto={c.aviso} /> : null}
        <Compositor onEnviar={c.enviar} enviando={c.enviando} />
      </View>
    </View>
  );
}

/** Conversación a pantalla completa en móvil y en la web estrecha. */
function ConversacionMovil({
  id,
  onCambio,
  accion,
}: {
  id: string;
  onCambio: () => void;
  accion?: ReactNode;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const c = useConversacion(id, onCambio);
  const volver = (
    <View style={styles.acciones}>
      <Boton
        texto="‹ Conversaciones"
        variante="secundario"
        onPress={() => router.replace('/chat')}
      />
      {accion}
    </View>
  );
  if (!c.datos) {
    return (
      <Pantalla titulo="Conversación" accion={volver} compacta>
        <SinConversacion error={c.error} cargando={c.cargando} onReintentar={c.recargar} />
      </Pantalla>
    );
  }
  return (
    <Pantalla titulo="Conversación" accion={volver} compacta>
      <View
        style={[
          styles.tarjetaMovil,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <CabeceraConversacion
          incidencia={c.datos.incidencia}
          onCambio={() => {
            c.recargar();
            onCambio();
          }}
        />
        <View style={styles.cuerpo}>
          <ListaMensajes mensajes={c.mensajes} yoId={usuario.id} />
        </View>
        <View style={styles.pie}>
          {c.aviso ? <Mensaje tipo="error" texto={c.aviso} /> : null}
          <Compositor onEnviar={c.enviar} enviando={c.enviando} />
        </View>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  columnaLista: { gap: Spacing.three },
  resumen: { flexDirection: 'row' },
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
  cuando: { fontSize: 12 },
  meta: { fontSize: 12, lineHeight: 16 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  punto: { width: 7, height: 7, borderRadius: Radius.pill },
  avatarFantasma: { width: 40, height: 40, borderRadius: Radius.pill },
  barra: { height: 12, borderRadius: Radius.control, marginVertical: 3 },
  paneles: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  panelLista: { width: 360, flexGrow: 0, borderRightWidth: 1 },
  contenidoPanelLista: { padding: Spacing.two },
  centrado: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  cabecera: { gap: Spacing.two, padding: Spacing.three, borderBottomWidth: 1 },
  botonDetalles: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.one + 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  detalles: { gap: Spacing.three, marginTop: Spacing.one },
  respuesta: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.button },
  cuerpo: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, flexGrow: 1 },
  pie: { gap: Spacing.two, padding: Spacing.three, paddingTop: 0 },
  tarjetaMovil: { borderWidth: 1, borderRadius: Radius.card, overflow: 'hidden' },
});
