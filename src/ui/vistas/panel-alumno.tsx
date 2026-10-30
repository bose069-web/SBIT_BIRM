import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import { obtenerBandeja } from '@/core/application/incidencias';
import { listarRegistros } from '@/core/application/registro-diario';
import { resumirHoras, totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import type { Dossier } from '@/core/domain/dossier';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Leyenda } from '@/ui/components/leyenda';
import { Pantalla } from '@/ui/components/pantalla';
import { Quesito } from '@/ui/components/quesito';
import { Tarjeta } from '@/ui/components/tarjeta';
import { TarjetaPendientes } from '@/ui/components/tarjeta-pendientes';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';
import { pendientesAlumno } from '@/ui/utils/pendientes';
import {
  calcularProgreso,
  horasPorActividad,
  nivelSinApuntar,
  semanaDePracticas,
  ultimosRegistros,
  type NivelAviso,
  type Progreso,
} from '@/ui/utils/progreso';

import { ESTADOS_DIA, LEYENDA_DIAS } from './calendario-mes';
import { EstadoMes } from './estado-mes';
import { MiniCalendario } from './mini-calendario';
import { TareasDossier } from './tareas';
import { ErrorCarga, EsqueletoPanel, EstadoVacio, ListaValoraciones } from './comun';

export function PanelAlumno() {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await obtenerDossierActual(container.dossiers, hoy);
    if (!dossier) return null;
    // Si fallan las incidencias, el resto del Inicio se sigue viendo.
    const [registros, seguimiento, bandeja] = await Promise.all([
      listarRegistros(container.registros, dossier.id, dossier.fechaInicio, dossier.fechaFin),
      obtenerSeguimiento(container.valoraciones, dossier, hoy),
      obtenerBandeja(container.incidencias, usuario).catch(() => null),
    ]);
    return {
      dossier,
      registros,
      resumen: resumirHoras(dossier, registros),
      progreso: calcularProgreso(dossier, registros, hoy),
      seguimiento,
      incidencias: bandeja?.mias ?? null,
    };
  }, [hoy, usuario.id]);
  useRecargarAlVolver(recargar);
  // En la web horizontal el panel se reparte en dos columnas; en el móvil, una debajo de otra.
  const ancho = useWebAncha();
  const mes = hoy.slice(0, 7);
  const mesesValidados = datos?.seguimiento.mensuales.map((v) => v.mes) ?? [];
  const semana = datos ? semanaDePracticas(datos.dossier, hoy) : null;
  const estadoMes = <EstadoMes hoy={hoy} mesesValidados={mesesValidados} />;
  const valoraciones = datos ? (
    <Tarjeta titulo="Valoraciones de la empresa">
      <ListaValoraciones mensuales={datos.seguimiento.mensuales} final={datos.seguimiento.final} />
    </Tarjeta>
  ) : null;

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={
        semana ? `${fechaCorta(hoy)} · semana ${semana.actual} de ${semana.total}` : fechaCorta(hoy)
      }
      // En la web el estado del mes llena el hueco junto al saludo; el botón de registrar ya
      // está en la cabecera.
      accion={ancho && datos ? estadoMes : undefined}
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {!cargando && !datos && !error ? (
        <EstadoVacio
          titulo="Todavía no tienes prácticas asignadas"
          texto="Cuando tu tutor del centro cree tu dossier de prácticas, aquí verás tus horas, el calendario y las valoraciones de la empresa."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <>
              <TarjetaPendientes
                pendientes={pendientesAlumno({
                  hoy,
                  sinApuntar: datos.progreso.sinApuntar,
                  seguimiento: datos.seguimiento,
                  incidencias: datos.incidencias,
                })}
                textoAlDia="Tienes los días apuntados y ninguna incidencia abierta."
                sinConfirmar={
                  datos.incidencias ? null : 'No se han podido comprobar tus incidencias.'
                }
              />
              {/* En la web, horas y calendario en tarjetas separadas; en el móvil, juntos en una
                  sola con el calendario arriba. */}
              <Tarjeta titulo="Horas de prácticas">
                {ancho ? null : (
                  <MiniCalendario hoy={hoy} registros={datos.registros} periodo={datos.dossier} />
                )}
                <View style={styles.quesito}>
                  <Quesito
                    porcentaje={datos.resumen.porcentaje}
                    etiqueta="Horas de prácticas completadas"
                  />
                  <View style={ancho ? undefined : styles.flex}>
                    <View style={styles.horas}>
                      <ThemedText type="title">{formatoHoras(datos.resumen.realizadas)}</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        de {formatoHoras(datos.resumen.totales)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {datos.resumen.porcentaje}% completado
                    </ThemedText>
                  </View>
                  {/* En la web sobra sitio junto al quesito: lo que falta y si se llega a tiempo. */}
                  {ancho ? <DatosProgreso progreso={datos.progreso} /> : null}
                </View>
              </Tarjeta>
              {ancho ? (
                <Tarjeta
                  titulo={nombreMes(mes)}
                  accion={
                    <Enlace
                      texto="Ver calendario ›"
                      onPress={() => router.navigate('/calendario')}
                    />
                  }>
                  <View style={styles.mes}>
                    <View style={styles.calendario}>
                      <MiniCalendario
                        hoy={hoy}
                        registros={datos.registros}
                        periodo={datos.dossier}
                        cabecera={false}
                      />
                    </View>
                    <View style={styles.actividades}>
                      <HorasActividades
                        dossier={datos.dossier}
                        registros={datos.registros}
                        mes={mes}
                      />
                      <Leyenda elementos={LEYENDA_DIAS} />
                    </View>
                  </View>
                </Tarjeta>
              ) : (
                <Tarjeta titulo="Este mes">
                  <EstadoMes hoy={hoy} mesesValidados={mesesValidados} enTarjeta />
                  <Boton texto="Registrar el día de hoy" onPress={() => router.push('/registro')} />
                </Tarjeta>
              )}
              {/* En la web las valoraciones van con el mes: así las dos columnas quedan
                  parejas. En el móvil, al final. */}
              {ancho ? valoraciones : null}
            </>
          }
          derecha={
            <>
              <Tarjeta titulo="Tareas">
                <TareasDossier dossier={datos.dossier} onCambio={recargar} />
              </Tarjeta>
              <Tarjeta
                titulo="Últimos registros"
                accion={
                  <Enlace texto="Ver todo ›" onPress={() => router.navigate('/calendario')} />
                }>
                <UltimosRegistros dossier={datos.dossier} registros={datos.registros} />
              </Tarjeta>
              <Tarjeta
                titulo="Mis prácticas"
                accion={
                  <Enlace
                    texto="Ficha ›"
                    onPress={() =>
                      router.push({ pathname: '/', params: { dossier: datos.dossier.id } })
                    }
                  />
                }>
                <View style={styles.ficha}>
                  <ThemedText type="smallBold">
                    {datos.dossier.empresa ?? 'Sin empresa'} · {datos.dossier.ciclo}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tutor: {datos.dossier.tutorNombre ?? 'sin asignar'} · Empresa:{' '}
                    {datos.dossier.tutorEmpresaNombre ?? 'sin asignar'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Hasta el {fechaCorta(datos.dossier.fechaFin)}
                  </ThemedText>
                </View>
              </Tarjeta>
              {ancho ? null : valoraciones}
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Horas del mes por actividad: en qué ha ido el tiempo. */
function HorasActividades({
  dossier,
  registros,
  mes,
}: {
  dossier: Dossier;
  registros: RegistroDiario[];
  mes: string;
}) {
  const theme = useTheme();
  const filas = horasPorActividad(dossier, registros, mes);
  const total = filas.reduce((s, f) => s + f.horas, 0);
  const maximo = Math.max(...filas.map((f) => f.horas), 1);
  return (
    <View style={styles.barras}>
      <View style={styles.horas}>
        <ThemedText type="subtitle">{formatoHoras(total)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          este mes
        </ThemedText>
      </View>
      {filas.map((f) => (
        <View
          key={f.id}
          style={styles.barra}
          accessible
          accessibilityLabel={`${f.descripcion}: ${formatoHoras(f.horas)}`}>
          <View style={styles.filaBarra}>
            <ThemedText type="small" style={styles.flex} numberOfLines={1}>
              {f.descripcion}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatoHoras(f.horas)}
            </ThemedText>
          </View>
          <View style={[styles.pista, { backgroundColor: theme.subtle }]}>
            <View
              style={[
                styles.relleno,
                { width: `${(f.horas / maximo) * 100}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Los tres últimos días apuntados; tocar uno abre su registro. */
function UltimosRegistros({
  dossier,
  registros,
}: {
  dossier: Dossier;
  registros: RegistroDiario[];
}) {
  const theme = useTheme();
  const ultimos = ultimosRegistros(registros, 3);
  if (ultimos.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Todavía no has apuntado ningún día.
      </ThemedText>
    );
  }
  const actividad = (id: string) => dossier.actividades.find((a) => a.id === id)?.descripcion;
  return (
    <View>
      {ultimos.map((r, i) => {
        const principal = [...r.horas].sort((a, b) => b.horas - a.horas)[0];
        const detalle =
          r.tipo === 'trabajo'
            ? `${formatoHoras(totalHoras(r))}${principal ? ` · ${actividad(principal.actividadId) ?? ''}` : ''}`
            : ESTADOS_DIA[r.tipo].texto;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${fechaCorta(r.fecha)}: ${detalle}. Abrir el registro`}
            onPress={() => router.push({ pathname: '/registro', params: { fecha: r.fecha } })}
            style={({ pressed }) => [
              styles.registro,
              i > 0 && { borderTopWidth: 1, borderColor: theme.border },
              pressed && { opacity: 0.6 },
            ]}>
            <View style={styles.filaBarra}>
              <ThemedText type="smallBold">{fechaCorta(r.fecha)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {detalle}
              </ThemedText>
            </View>
            {r.observaciones ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {r.observaciones}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Sin días pendientes, el número va en el color normal del texto.
const COLOR_AVISO: Record<NivelAviso, ThemeColor | null> = {
  ninguno: null,
  leve: 'avisoLeve',
  medio: 'avisoMedio',
  grave: 'danger',
};

function DatosProgreso({ progreso }: { progreso: Progreso }) {
  const theme = useTheme();
  const { quedan, horasSemana, sinApuntar, finEstimado, aTiempo } = progreso;
  const pendientes = sinApuntar.length;
  const colorAviso = COLOR_AVISO[nivelSinApuntar(pendientes)];
  return (
    <View style={styles.datos}>
      <View style={styles.cifras}>
        <Cifra etiqueta="Te quedan" valor={formatoHoras(quedan)} />
        <Cifra etiqueta="Esta semana" valor={formatoHoras(horasSemana)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            pendientes
              ? `${pendientes} días sin apuntar. Apuntar el primero`
              : 'Todos los días apuntados'
          }
          disabled={!pendientes}
          onPress={() => router.push({ pathname: '/registro', params: { fecha: sinApuntar[0] } })}
          style={({ pressed }) => [styles.flex, pressed && { opacity: 0.6 }]}>
          <Cifra
            etiqueta="Sin apuntar"
            valor={`${pendientes} ${pendientes === 1 ? 'día' : 'días'}${pendientes ? ' ›' : ''}`}
            color={colorAviso ? theme[colorAviso] : undefined}
          />
        </Pressable>
      </View>
      {finEstimado ? (
        <ThemedText type="small">
          {quedan === 0
            ? 'Horas completadas'
            : `A este ritmo terminas el ${fechaCorta(finEstimado)}${aTiempo ? ', a tiempo' : ', después del fin previsto'}`}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Cifra({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View style={styles.flex}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText type="subtitle" style={color ? { color } : undefined}>
        {valor}
      </ThemedText>
    </View>
  );
}

/** Dos columnas en la web ancha (la principal más ancha); en el móvil, todo seguido. */
function Columnas({
  ancho,
  izquierda,
  derecha,
}: {
  ancho: boolean;
  izquierda: ReactNode;
  derecha: ReactNode;
}) {
  if (!ancho) {
    return (
      <>
        {izquierda}
        {derecha}
      </>
    );
  }
  return (
    <View style={styles.columnas}>
      <View style={styles.principal}>{izquierda}</View>
      <View style={styles.lateral}>{derecha}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  horas: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  quesito: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  mes: { flexDirection: 'row', gap: Spacing.five },
  calendario: { flex: 1.3 },
  actividades: { flex: 1, gap: Spacing.four, justifyContent: 'space-between' },
  barras: { gap: Spacing.three },
  barra: { gap: Spacing.one },
  filaBarra: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pista: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: Radius.pill },
  registro: { paddingVertical: Spacing.two, gap: 2 },
  ficha: { gap: Spacing.one },
  flex: { flex: 1, gap: Spacing.one },
  datos: { flex: 1, gap: Spacing.two, paddingLeft: Spacing.two },
  cifras: { flexDirection: 'row', gap: Spacing.three },
});
