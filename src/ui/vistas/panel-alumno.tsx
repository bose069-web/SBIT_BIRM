import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import { resumirHoras } from '@/core/domain/registro-diario';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { mesCerrado, mesDe } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { Pantalla } from '@/ui/components/pantalla';
import { Quesito } from '@/ui/components/quesito';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';
import { calcularProgreso, type Progreso } from '@/ui/utils/progreso';

import { MiniCalendario } from './mini-calendario';
import { TareasDossier } from './tareas';
import {
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  estilosComunes,
} from './comun';

export function PanelAlumno() {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await obtenerDossierActual(container.dossiers, hoy);
    if (!dossier) return null;
    const [registros, seguimiento] = await Promise.all([
      listarRegistros(container.registros, dossier.id, dossier.fechaInicio, dossier.fechaFin),
      obtenerSeguimiento(container.valoraciones, dossier, hoy),
    ]);
    return {
      dossier,
      resumen: resumirHoras(dossier, registros),
      progreso: calcularProgreso(dossier, registros, hoy),
      seguimiento,
    };
  }, [hoy]);
  useRecargarAlVolver(recargar);
  const { width } = useWindowDimensions();
  // En la web horizontal el panel se reparte en dos columnas; en el móvil, una debajo de otra.
  const ancho = Platform.OS === 'web' && width >= 1000;

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={fechaCorta(hoy)}
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
              <Tarjeta titulo="Horas de prácticas">
                {/* En la web el quesito y sus datos van arriba; en el móvil, el calendario primero. */}
                {ancho ? null : <MiniCalendario hoy={hoy} />}
                <View style={[styles.quesito, !ancho && styles.separado]}>
                  <Quesito
                    porcentaje={datos.resumen.porcentaje}
                    etiqueta="Horas de prácticas completadas"
                  />
                  <View style={styles.flex}>
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
                {ancho ? (
                  <View style={styles.separado}>
                    <MiniCalendario hoy={hoy} />
                  </View>
                ) : null}
              </Tarjeta>
              <Tarjeta titulo="Este mes">
                <View style={estilosComunes.fila}>
                  <ThemedText type="smallBold" style={estilosComunes.capital}>
                    {nombreMes(mesDe(hoy))}
                  </ThemedText>
                  {mesCerrado(hoy, datos.seguimiento.mensuales, datos.seguimiento.final) ? (
                    <Chip texto="Cerrado: ya valorado" color="estadoFestivo" />
                  ) : (
                    <Chip texto="Abierto" color="estadoValidado" />
                  )}
                </View>
                <Boton texto="Registrar el día de hoy" onPress={() => router.push('/registro')} />
              </Tarjeta>
            </>
          }
          derecha={
            <>
              <Tarjeta titulo="Tareas">
                <TareasDossier dossier={datos.dossier} />
              </Tarjeta>
              <Tarjeta titulo="Mis prácticas">
                <ThemedText type="smallBold">
                  {datos.dossier.ciclo} · {datos.dossier.empresa ?? 'Sin empresa'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {datos.dossier.centro ?? 'Sin centro'} · del{' '}
                  {fechaCorta(datos.dossier.fechaInicio)} al {fechaCorta(datos.dossier.fechaFin)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Tutor del centro: {datos.dossier.tutorNombre ?? 'sin asignar'}
                  {'\n'}Tutor de empresa: {datos.dossier.tutorEmpresaNombre ?? 'sin asignar'}
                </ThemedText>
                <Boton
                  texto="Ver la ficha completa"
                  variante="secundario"
                  onPress={() =>
                    router.push({ pathname: '/', params: { dossier: datos.dossier.id } })
                  }
                />
              </Tarjeta>
              <Tarjeta titulo="Valoraciones de la empresa">
                <ListaValoraciones
                  mensuales={datos.seguimiento.mensuales}
                  final={datos.seguimiento.final}
                />
              </Tarjeta>
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

function DatosProgreso({ progreso }: { progreso: Progreso }) {
  const theme = useTheme();
  const { quedan, horasSemana, sinApuntar, finEstimado, aTiempo } = progreso;
  const pendientes = sinApuntar.length;
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
            valor={pendientes ? `${pendientes} ${pendientes === 1 ? 'día' : 'días'} ›` : 'Al día'}
            color={pendientes ? theme.estadoPendiente : theme.estadoValidado}
          />
        </Pressable>
      </View>
      {finEstimado ? (
        <ThemedText
          type="small"
          style={{ color: aTiempo ? theme.estadoValidado : theme.estadoPendiente }}>
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
  flex: { flex: 1, gap: Spacing.one },
  datos: { flex: 1.6, gap: Spacing.two, paddingLeft: Spacing.four },
  cifras: { flexDirection: 'row', gap: Spacing.three },
  separado: { paddingTop: Spacing.two },
});
