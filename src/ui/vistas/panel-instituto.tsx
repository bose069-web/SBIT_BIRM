import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { incorporarAlumno, type PanelCentro } from '@/core/application/centro';
import { listarMensajes, obtenerBandeja } from '@/core/application/incidencias';
import type { Centro } from '@/core/domain/centro';
import type { Incidencia, MensajeIncidencia } from '@/core/domain/incidencia';
import { container } from '@/config/container';
import { Avatar } from '@/ui/components/avatar';
import { Boton } from '@/ui/components/boton';
import { Buscador } from '@/ui/components/buscador';
import { Chip } from '@/ui/components/chip';
import { Cifra } from '@/ui/components/cifra';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { TarjetaPendientes } from '@/ui/components/tarjeta-pendientes';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { usePanelCentro, type HacerEnCentro } from '@/ui/hooks/use-panel-centro';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import { hace } from '@/ui/utils/chat';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';
import { pendientesCentro } from '@/ui/utils/pendientes';

import { NuevoEvento, ProximasFechas } from './agenda';
import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';
import { COLOR_ESTADO, TEXTO_ESTADO } from './incidencias';

/** Hasta aquí se eligen en tarjetas; con más centros se busca por nombre. */
const MAXIMO_TARJETAS_CENTRO = 6;
const CUENTAS_EN_INICIO = 3;
const CONVENIOS_EN_INICIO = 4;
const INCIDENCIAS_EN_INICIO = 4;

interface ConversacionReciente {
  incidencia: Incidencia;
  ultimo: MensajeIncidencia | null;
  fecha: string;
}

/** Las incidencias del centro, de la que se movió por última vez a la más antigua. */
function useIncidenciasCentro(centroId: string | null) {
  const usuario = useUsuario();
  const resultado = useDatos(async () => {
    const bandeja = await obtenerBandeja(container.incidencias, usuario);
    // La generalitat las ve todas: solo las del instituto elegido y las que atiende ella directamente.
    const delCentro = (i: Incidencia) => i.centroId === centroId || i.centroId === null;
    const porAtender = bandeja.porAtender.filter(delCentro);
    const recientes = await Promise.all(
      [...porAtender, ...bandeja.mias.filter(delCentro)].map(
        async (incidencia): Promise<ConversacionReciente> => {
          // Si falla un hilo, la incidencia se sigue viendo con su fecha de apertura.
          const mensajes = await listarMensajes(container.incidencias, usuario, incidencia).catch(
            () => [],
          );
          const ultimo = mensajes[mensajes.length - 1] ?? null;
          return { incidencia, ultimo, fecha: ultimo?.creadoEn ?? incidencia.creadaEn };
        },
      ),
    );
    return {
      recientes: recientes.sort((a, b) => b.fecha.localeCompare(a.fecha)),
      porAtender,
      pendientes: porAtender.filter((i) => i.estado !== 'resuelta').length,
    };
  }, [usuario.id, centroId]);
  useRecargarAlVolver(resultado.recargar);
  return resultado;
}

/**
 * Inicio del instituto y de la generalitat: el panel de gestión del centro. Primero el centro y lo
 * que pide una acción; después incidencias y convenios. Los alumnos se gestionan en segundo nivel.
 */
export function PanelInstituto() {
  const usuario = useUsuario();
  const ancho = useWebAncha();
  const {
    esGeneralitat,
    centros,
    centroId,
    elegirCentro,
    datos,
    error,
    cargando,
    recargar,
    aviso,
    hacer,
  } = usePanelCentro();
  const incidencias = useIncidenciasCentro(centroId);
  const titulo = `Hola, ${usuario.nombre.split(' ')[0]}`;
  const subtitulo = esGeneralitat ? 'Gestión de los institutos' : 'Gestión de tu centro';
  const estiloTarjeta = ancho ? styles.tarjetaAncha : undefined;
  const hoy = hoyISO();

  const fechasGenerales = (
    <Tarjeta titulo="Fechas para todos" style={estiloTarjeta}>
      <ThemedText type="small" themeColor="textSecondary">
        Festivos, entregas o reuniones generales: los ven todos los alumnos en su calendario.
      </ThemedText>
      <ProximasFechas hoy={hoy} soloGenerales />
      <NuevoEvento />
    </Tarjeta>
  );

  if (!centroId) {
    return (
      <Pantalla titulo={titulo} subtitulo={subtitulo} amplia={ancho}>
        {esGeneralitat ? (
          centros.error ? (
            <ErrorCarga texto={centros.error} onReintentar={centros.recargar} />
          ) : centros.datos ? (
            <EstadoVacio
              titulo="Todavía no hay institutos"
              texto="Cuando se dé de alta un centro, aparecerá aquí para poder gestionarlo."
              accion={{ texto: 'Volver a mirar', onPress: centros.recargar }}
            />
          ) : (
            <EsqueletoPanel tarjetas={2} />
          )
        ) : (
          <ErrorCarga texto="Tu cuenta no está asociada a ningún centro." onReintentar={recargar} />
        )}
        {esGeneralitat ? fechasGenerales : null}
      </Pantalla>
    );
  }

  // La generalitat lleva el instituto elegido a la pantalla secundaria.
  const params: Record<string, string> = esGeneralitat ? { centro: centroId } : {};
  const abrirAlumnos = () => router.push({ pathname: '/alumnos', params });
  const abrirConvenios = () => router.push({ pathname: '/centro', params });

  const bloqueCentro = (
    <Tarjeta
      titulo={esGeneralitat ? 'Institutos que gestionas' : 'Tu centro'}
      style={estiloTarjeta}>
      {esGeneralitat ? (
        <SelectorCentros centros={centros.datos ?? []} valor={centroId} onCambio={elegirCentro} />
      ) : datos ? (
        <CabeceraCentro centro={datos.centro} />
      ) : null}
      {datos ? (
        <CifrasCentro datos={datos} pendientes={incidencias.datos?.pendientes} ancho={ancho} />
      ) : null}
    </Tarjeta>
  );

  const cuerpo = datos ? (
    <>
      <RequiereAccion
        datos={datos}
        incidencias={incidencias.datos?.porAtender ?? null}
        hayErrorIncidencias={Boolean(incidencias.error)}
        params={params}
        hacer={hacer}
        onAlumnos={abrirAlumnos}
        estilo={estiloTarjeta}
      />
    </>
  ) : null;

  const bloqueIncidencias = (
    <Tarjeta
      titulo="Incidencias recientes"
      style={estiloTarjeta}
      accion={<Enlace texto="Abrir chat ›" onPress={() => router.navigate('/chat')} />}>
      {incidencias.error && !incidencias.datos ? (
        <ErrorCarga texto={incidencias.error} onReintentar={incidencias.recargar} />
      ) : !incidencias.datos ? (
        <EsqueletoPanel tarjetas={1} />
      ) : incidencias.datos.recientes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No hay incidencias en este centro. Cuando alguien avise de un problema, aparecerá aquí.
        </ThemedText>
      ) : (
        <View style={styles.lista}>
          {incidencias.datos.recientes.slice(0, INCIDENCIAS_EN_INICIO).map((c) => (
            <FilaIncidencia key={c.incidencia.id} conversacion={c} />
          ))}
        </View>
      )}
    </Tarjeta>
  );

  const bloqueConvenios = datos ? (
    <ResumenConvenios datos={datos} onGestionar={abrirConvenios} estilo={estiloTarjeta} />
  ) : null;
  const bloqueAlumnos = datos ? (
    <ResumenAlumnos datos={datos} onGestionar={abrirAlumnos} estilo={estiloTarjeta} />
  ) : null;

  return (
    <Pantalla titulo={titulo} subtitulo={subtitulo} amplia={ancho}>
      {centros.error ? <ErrorCarga texto={centros.error} onReintentar={centros.recargar} /> : null}
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {!cargando && !datos && !error ? (
        <EstadoVacio
          titulo="No se pudo cargar el centro"
          texto="Revisa la conexión y vuelve a intentarlo."
          accion={{ texto: 'Reintentar', onPress: recargar }}
        />
      ) : null}
      {datos ? (
        ancho ? (
          <View style={styles.columnas}>
            <View style={styles.principal}>
              {bloqueCentro}
              {cuerpo}
              {bloqueIncidencias}
            </View>
            <View style={styles.lateral}>
              {bloqueAlumnos}
              {bloqueConvenios}
              {fechasGenerales}
            </View>
          </View>
        ) : (
          <View style={styles.bloques}>
            {bloqueCentro}
            {cuerpo}
            {bloqueIncidencias}
            {bloqueConvenios}
            {bloqueAlumnos}
            {fechasGenerales}
          </View>
        )
      ) : null}
    </Pantalla>
  );
}

function CabeceraCentro({ centro }: { centro: Centro }) {
  return (
    <View style={styles.filaCentrada}>
      <Avatar nombre={centro.nombre} tamano={52} />
      <View style={styles.flex}>
        <ThemedText type="subtitle">{centro.nombre}</ThemedText>
        {centro.codigo ? (
          <ThemedText type="small" themeColor="textSecondary">
            Código de centro {centro.codigo}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/** La generalitat elige instituto: en tarjetas si son pocos y con buscador si son muchos. */
function SelectorCentros({
  centros,
  valor,
  onCambio,
}: {
  centros: Centro[];
  valor: string;
  onCambio: (id: string) => void;
}) {
  const theme = useTheme();
  if (centros.length > MAXIMO_TARJETAS_CENTRO) {
    return (
      <Buscador
        etiqueta="Instituto"
        placeholder="Busca por nombre"
        opciones={centros.map((c) => ({
          valor: c.id,
          texto: c.nombre,
          detalle: c.codigo ?? undefined,
        }))}
        valor={valor}
        onCambio={onCambio}
      />
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Instituto" style={styles.rejilla}>
      {centros.map((c) => {
        const activo = c.id === valor;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityLabel={c.nombre}
            accessibilityState={{ checked: activo }}
            onPress={() => onCambio(c.id)}
            style={({ pressed }) => [
              styles.centro,
              {
                borderColor: activo ? theme.primary : theme.border,
                backgroundColor: pressed ? theme.subtle : 'transparent',
              },
            ]}>
            <Avatar nombre={c.nombre} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">{c.nombre}</ThemedText>
              {c.codigo ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {c.codigo}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CifrasCentro({
  datos,
  pendientes,
  ancho,
}: {
  datos: PanelCentro;
  /** Sin definir mientras cargan las incidencias. */
  pendientes: number | undefined;
  ancho: boolean;
}) {
  const estilo = ancho ? styles.cifraAncha : undefined;
  return (
    <View style={styles.cifras}>
      <Cifra style={estilo} valor={`${datos.alumnos.length}`} etiqueta="Alumnos" />
      <Cifra style={estilo} valor={`${datos.profes.length}`} etiqueta="Profes" />
      <Cifra style={estilo} valor={`${datos.convenios.length}`} etiqueta="Convenios" />
      <Cifra
        style={estilo}
        valor={pendientes === undefined ? '–' : `${pendientes}`}
        etiqueta="Incidencias"
        detalle="pendientes"
        color={pendientes ? 'estadoPendiente' : 'text'}
      />
    </View>
  );
}

/** Lo primero de hoy. Las cuentas nuevas se resuelven aquí; el resto lleva a su pantalla. */
function RequiereAccion({
  datos,
  incidencias,
  hayErrorIncidencias,
  params,
  hacer,
  onAlumnos,
  estilo,
}: {
  datos: PanelCentro;
  /** Null mientras cargan o si no se han podido cargar. */
  incidencias: Incidencia[] | null;
  hayErrorIncidencias: boolean;
  params: Record<string, string>;
  hacer: HacerEnCentro;
  onAlumnos: () => void;
  estilo: typeof styles.tarjetaAncha | undefined;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const cuentas = datos.cuentasNuevas;
  const sinConfirmar = incidencias
    ? null
    : hayErrorIncidencias
      ? 'No se han podido comprobar las incidencias.'
      : 'Comprobando las incidencias…';
  return (
    <TarjetaPendientes
      pendientes={pendientesCentro({
        alumnosSinProfe: datos.alumnos.filter((a) => !a.profeId).length,
        convenios: datos.convenios.length,
        incidencias,
        params,
      })}
      textoAlDia="Sin cuentas por añadir, alumnos sin profe ni incidencias pendientes."
      sinConfirmar={sinConfirmar}
      style={estilo}
      extra={
        cuentas.length > 0 ? (
          <View style={[styles.cuentas, { borderTopColor: theme.border }]}>
            <ThemedText type="smallBold">
              {cuentas.length === 1 ? '1 cuenta nueva' : `${cuentas.length} cuentas nuevas`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Se han registrado y aún no son de ningún centro.
            </ThemedText>
            {cuentas.slice(0, CUENTAS_EN_INICIO).map((p) => (
              <View key={p.id} style={styles.cuentaNueva}>
                <View style={styles.persona}>
                  <Avatar nombre={p.nombre} />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{p.nombre}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {p.email}
                    </ThemedText>
                  </View>
                </View>
                <Boton
                  texto="Añadir como alumno"
                  variante="secundario"
                  onPress={() =>
                    hacer(
                      () => incorporarAlumno(container.centros, usuario, p, datos.centro.id),
                      `${p.nombre} ya es alumno de ${datos.centro.nombre}`,
                    )
                  }
                />
              </View>
            ))}
            {cuentas.length > CUENTAS_EN_INICIO ? (
              <Enlace texto={`Ver las ${cuentas.length} cuentas ›`} onPress={onAlumnos} />
            ) : null}
          </View>
        ) : null
      }
    />
  );
}

function FilaIncidencia({ conversacion }: { conversacion: ConversacionReciente }) {
  const { incidencia: i, ultimo, fecha } = conversacion;
  const autor = ultimo?.autorNombre ?? i.creadaPorNombre ?? 'Alguien';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${i.titulo}, ${TEXTO_ESTADO[i.estado]}. Abrir conversación`}
      onPress={() => router.push({ pathname: '/chat', params: { incidencia: i.id } })}
      style={({ pressed }) => [styles.filaAccion, pressed && styles.pulsada]}>
      <Avatar nombre={autor} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {i.titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {autor}: {ultimo?.texto ?? i.descripcion}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hace(fecha)}
        </ThemedText>
      </View>
      <Chip texto={TEXTO_ESTADO[i.estado]} color={COLOR_ESTADO[i.estado]} />
    </Pressable>
  );
}

function ResumenConvenios({
  datos,
  onGestionar,
  estilo,
}: {
  datos: PanelCentro;
  onGestionar: () => void;
  estilo: typeof styles.tarjetaAncha | undefined;
}) {
  const resto = datos.convenios.length - CONVENIOS_EN_INICIO;
  return (
    <Tarjeta titulo={`Convenios (${datos.convenios.length})`} style={estilo}>
      {datos.convenios.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay convenios. Los alumnos solo pueden hacer prácticas en empresas con
          convenio.
        </ThemedText>
      ) : (
        <View style={styles.lista}>
          {datos.convenios.slice(0, CONVENIOS_EN_INICIO).map((c) => (
            <View key={c.empresaId} style={styles.filaCentrada}>
              <Avatar nombre={c.empresaNombre} tamano={32} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{c.empresaNombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {c.firmadoEn ? `Firmado el ${fechaCorta(c.firmadoEn)}` : 'Sin fecha de firma'}
                </ThemedText>
              </View>
            </View>
          ))}
          {resto > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Y {resto} más
            </ThemedText>
          ) : null}
        </View>
      )}
      <Boton texto="Gestionar convenios" variante="secundario" onPress={onGestionar} />
    </Tarjeta>
  );
}

/** Puerta de entrada a la gestión de alumnos, que vive en su propia pantalla. */
function ResumenAlumnos({
  datos,
  onGestionar,
  estilo,
}: {
  datos: PanelCentro;
  onGestionar: () => void;
  estilo: typeof styles.tarjetaAncha | undefined;
}) {
  const sinProfe = datos.alumnos.filter((a) => !a.profeId).length;
  return (
    <Tarjeta titulo={`Alumnos (${datos.alumnos.length})`} style={estilo}>
      <ThemedText type="small" themeColor="textSecondary">
        Profe tutor de cada uno, altas, dossiers y seguimiento de las prácticas.
      </ThemedText>
      {sinProfe > 0 ? (
        <Chip
          texto={sinProfe === 1 ? '1 sin profe asignado' : `${sinProfe} sin profe asignado`}
          color="estadoPendiente"
        />
      ) : null}
      <Boton texto="Gestionar alumnos" onPress={onGestionar} />
    </Tarjeta>
  );
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.enlace, pressed && styles.pulsada]}>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  principal: { flex: 1.7, gap: Spacing.four },
  lateral: { flex: 1, gap: Spacing.four },
  bloques: { gap: Spacing.four },
  tarjetaAncha: { padding: Spacing.four },
  flex: { flex: 1, gap: 2 },
  lista: { gap: Spacing.two },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  centro: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.button,
  },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cifraAncha: { flexBasis: '22%' },
  filaCentrada: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  persona: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  filaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.one,
    borderRadius: Radius.button,
  },
  cuentas: {
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cuentaNueva: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pulsada: { opacity: 0.6 },
  enlace: { minHeight: 44, justifyContent: 'center', marginVertical: -Spacing.two },
});
