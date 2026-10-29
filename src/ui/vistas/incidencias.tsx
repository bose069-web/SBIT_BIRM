import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import {
  abrirIncidencia,
  atenderIncidencia,
  enviarMensaje,
  escalarIncidencia,
  listarMensajes,
  obtenerBandeja,
} from '@/core/application/incidencias';
import {
  atiendeIncidencia,
  CATEGORIAS_INCIDENCIA,
  ESTADOS_INCIDENCIA,
  type CategoriaIncidencia,
  type EstadoIncidencia,
  type Incidencia,
  type PrioridadIncidencia,
} from '@/core/domain/incidencia';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

export const TEXTO_CATEGORIA: Record<CategoriaIncidencia, string> = {
  practicas: 'Prácticas',
  empresa: 'Empresa',
  convenio: 'Convenio',
  app: 'La app',
  otra: 'Otra',
};
export const TEXTO_ESTADO: Record<EstadoIncidencia, string> = {
  abierta: 'Abierta',
  en_curso: 'En curso',
  resuelta: 'Resuelta',
};
export const COLOR_ESTADO: Record<EstadoIncidencia, ThemeColor> = {
  abierta: 'estadoPendiente',
  en_curso: 'primary',
  resuelta: 'estadoValidado',
};
export const TEXTO_PRIORIDAD: Record<PrioridadIncidencia, string> = {
  baja: 'Prioridad baja',
  media: 'Prioridad media',
  alta: 'Prioridad alta',
};

const abrirDetalle = (id: string) => router.push({ pathname: '/chat', params: { incidencia: id } });

/** Bandeja de incidencias: lo que atiendo, lo de mis alumnos y lo que he abierto yo. */
export function BandejaIncidencias() {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(
    () => obtenerBandeja(container.incidencias, usuario),
    [usuario.id],
  );
  useRecargarAlVolver(recargar);

  if (!datos) {
    return (
      <>
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoPanel tarjetas={2} /> : null}
      </>
    );
  }
  const vacia = !datos.porAtender.length && !datos.deMisAlumnos.length && !datos.mias.length;
  return (
    <>
      {datos.porAtender.length ? (
        <Tarjeta
          titulo="Por atender"
          accion={
            datos.pendientes ? (
              <Chip texto={`${datos.pendientes} pendientes`} color="estadoPendiente" />
            ) : null
          }>
          <ListaIncidencias lista={datos.porAtender} />
        </Tarjeta>
      ) : null}
      {datos.deMisAlumnos.length ? (
        <Tarjeta titulo="De mis alumnos">
          <ListaIncidencias lista={datos.deMisAlumnos} />
        </Tarjeta>
      ) : null}
      {datos.mias.length ? (
        <Tarjeta titulo="Abiertas por mí">
          <ListaIncidencias lista={datos.mias} />
        </Tarjeta>
      ) : null}
      {vacia ? (
        <EstadoVacio
          titulo="Sin incidencias"
          texto="Si algo no va bien en las prácticas, con la empresa o con la app, cuéntalo aquí."
        />
      ) : null}
      <NuevaIncidencia onCreada={recargar} />
    </>
  );
}

function ListaIncidencias({ lista }: { lista: Incidencia[] }) {
  const theme = useTheme();
  return (
    <View style={styles.lista}>
      {lista.map((i) => (
        <Pressable
          key={i.id}
          accessibilityRole="button"
          accessibilityLabel={`${i.titulo}, ${TEXTO_ESTADO[i.estado]}`}
          onPress={() => abrirDetalle(i.id)}
          style={({ pressed }) => [
            styles.fila,
            { backgroundColor: pressed ? theme.subtle : 'transparent', borderColor: theme.border },
          ]}>
          <View style={styles.textoFila}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {i.titulo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {i.creadaPorNombre ?? 'Alguien'} · {fechaCorta(i.creadaEn.slice(0, 10))} ·{' '}
              {TEXTO_CATEGORIA[i.categoria]}
              {i.escalada ? ' · escalada' : ''}
            </ThemedText>
          </View>
          <Chip texto={TEXTO_ESTADO[i.estado]} color={COLOR_ESTADO[i.estado]} />
        </Pressable>
      ))}
    </View>
  );
}

export function NuevaIncidencia({
  onCreada,
  onAbrir = abrirDetalle,
}: {
  onCreada: () => void;
  onAbrir?: (id: string) => void;
}) {
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaIncidencia>('practicas');
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!abierto) {
    return <Boton texto="+ Nueva incidencia" onPress={() => setAbierto(true)} />;
  }

  async function enviar() {
    setAviso(null);
    setEnviando(true);
    try {
      // El alumno la abre sobre su dossier: así la ven su profe tutor y su instituto.
      const dossier =
        usuario.rol === 'alumno' ? await obtenerDossierActual(container.dossiers, hoyISO()) : null;
      const creada = await abrirIncidencia(container.incidencias, {
        dossierId: dossier?.id ?? null,
        titulo,
        descripcion,
        categoria,
      });
      setAbierto(false);
      setTitulo('');
      setDescripcion('');
      onCreada();
      onAbrir(creada.id);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta titulo="Nueva incidencia">
      <Campo
        etiqueta="Qué pasa"
        placeholder="No me cuadran las horas de octubre"
        value={titulo}
        onChangeText={setTitulo}
      />
      <Campo etiqueta="Cuéntalo" multiline value={descripcion} onChangeText={setDescripcion} />
      <Selector
        etiqueta="Sobre"
        opciones={CATEGORIAS_INCIDENCIA.map((c) => ({ valor: c, texto: TEXTO_CATEGORIA[c] }))}
        valor={categoria}
        onCambio={setCategoria}
      />
      {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
      <Boton
        texto="Enviar"
        onPress={enviar}
        cargando={enviando}
        desactivado={!titulo.trim() || !descripcion.trim()}
      />
      <Boton texto="Cancelar" variante="secundario" onPress={() => setAbierto(false)} />
    </Tarjeta>
  );
}

/** Una incidencia con su conversación. Quien la atiende cambia el estado y responde. */
export function DetalleIncidencia({ id, onVolver }: { id: string; onVolver: () => void }) {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const todas = await container.incidencias.listar();
    const incidencia = todas.find((i) => i.id === id) ?? null;
    if (!incidencia) return null;
    const mensajes = await listarMensajes(container.incidencias, usuario, incidencia);
    return { incidencia, mensajes };
  }, [id]);
  const volver = <Boton texto="‹ Volver" variante="secundario" onPress={onVolver} />;

  if (!datos) {
    return (
      <Pantalla titulo="Incidencia">
        {volver}
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoPanel tarjetas={2} /> : null}
        {!cargando && !error ? (
          <EstadoVacio titulo="No se encuentra" texto="Puede que se haya borrado." />
        ) : null}
      </Pantalla>
    );
  }
  const { incidencia: i, mensajes } = datos;
  return (
    <Pantalla
      titulo={i.titulo}
      subtitulo={`${TEXTO_CATEGORIA[i.categoria]} · ${fechaCorta(i.creadaEn.slice(0, 10))}`}>
      {volver}
      <Tarjeta titulo="Incidencia">
        <View style={styles.chips}>
          <Chip texto={TEXTO_ESTADO[i.estado]} color={COLOR_ESTADO[i.estado]} />
          <Chip texto={TEXTO_PRIORIDAD[i.prioridad]} />
          {i.escalada ? <Chip texto="Escalada a la Generalitat" /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Abierta por {i.creadaPorNombre ?? 'alguien'}
        </ThemedText>
        <ThemedText>{i.descripcion}</ThemedText>
        {i.respuesta ? (
          <View style={styles.respuesta}>
            <ThemedText type="smallBold">Respuesta</ThemedText>
            <ThemedText type="small">{i.respuesta}</ThemedText>
          </View>
        ) : null}
      </Tarjeta>

      {atiendeIncidencia(usuario, i) ? <Atender incidencia={i} onCambio={recargar} /> : null}

      <Tarjeta titulo="Conversación">
        <Conversacion incidencia={i} mensajes={mensajes} onEnviado={recargar} />
      </Tarjeta>
    </Pantalla>
  );
}

export function Atender({
  incidencia,
  onCambio,
}: {
  incidencia: Incidencia;
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const [estado, setEstado] = useState<EstadoIncidencia>(incidencia.estado);
  const [respuesta, setRespuesta] = useState(incidencia.respuesta ?? '');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function ejecutar(accion: () => Promise<unknown>, ok: string) {
    setAviso(null);
    setEnviando(true);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: ok });
      onCambio();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  }

  const puedeEscalar =
    usuario.rol === 'instituto' && !incidencia.escalada && incidencia.estado !== 'resuelta';
  return (
    <Tarjeta titulo="Atender">
      <Selector
        etiqueta="Estado"
        opciones={ESTADOS_INCIDENCIA.map((e) => ({ valor: e, texto: TEXTO_ESTADO[e] }))}
        valor={estado}
        onCambio={setEstado}
      />
      <Campo
        etiqueta="Respuesta"
        ayuda="Obligatoria para marcarla como resuelta"
        multiline
        value={respuesta}
        onChangeText={setRespuesta}
      />
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <Boton
        texto="Guardar"
        cargando={enviando}
        onPress={() =>
          ejecutar(
            () =>
              atenderIncidencia(container.incidencias, usuario, incidencia, { estado, respuesta }),
            'Guardado',
          )
        }
      />
      {puedeEscalar ? (
        <Boton
          texto="Pasar a la Generalitat"
          variante="secundario"
          desactivado={enviando}
          onPress={() =>
            ejecutar(
              () => escalarIncidencia(container.incidencias, usuario, incidencia, respuesta),
              'Escalada a la Generalitat',
            )
          }
        />
      ) : null}
    </Tarjeta>
  );
}

function Conversacion({
  incidencia,
  mensajes,
  onEnviado,
}: {
  incidencia: Incidencia;
  mensajes: Awaited<ReturnType<typeof listarMensajes>>;
  onEnviado: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setAviso(null);
    setEnviando(true);
    try {
      await enviarMensaje(container.incidencias, usuario, incidencia, texto);
      setTexto('');
      onEnviado();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.lista}>
      {mensajes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay mensajes. Escribe para hablar con quien la sigue.
        </ThemedText>
      ) : null}
      {mensajes.map((m) => {
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
            {!mio ? <ThemedText type="smallBold">{m.autorNombre ?? 'Alguien'}</ThemedText> : null}
            <ThemedText type="small" style={mio ? { color: theme.onPrimary } : undefined}>
              {m.texto}
            </ThemedText>
          </View>
        );
      })}
      <Campo etiqueta="Mensaje" multiline value={texto} onChangeText={setTexto} />
      {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
      <Boton texto="Enviar" onPress={enviar} cargando={enviando} desactivado={!texto.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: Spacing.two },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    minHeight: 56,
  },
  textoFila: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  respuesta: { gap: Spacing.one },
  burbuja: { maxWidth: '85%', padding: Spacing.three, borderRadius: Radius.card, gap: 2 },
});
