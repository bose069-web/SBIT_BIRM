import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import { obtenerBandeja } from '@/core/application/incidencias';
import { listarRegistros } from '@/core/application/registro-diario';
import { crearTarea } from '@/core/application/tareas';
import type { Dossier } from '@/core/domain/dossier';
import type { Incidencia } from '@/core/domain/incidencia';
import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import {
  alumnosSinApuntar,
  DIAS_PARA_AVISAR,
  textoToque,
  type AlumnoSinApuntar,
} from '@/ui/utils/avisos-profe';
import { fechaCorta, formatoHoras, hoyISO, sumarDias } from '@/ui/utils/fechas';

import { ErrorCarga, EsqueletoPanel, EstadoVacio, porAlumno } from './comun';
import { COLOR_ESTADO, TEXTO_ESTADO } from './incidencias';

/** Cuántos días hacia atrás se miran los registros de los alumnos. */
const DIAS_ATRAS = 45;
/** Días recientes que se enseñan en "Horas por validar". */
const DIAS_RECIENTES = 7;

interface DiaApuntado {
  dossier: Dossier;
  registro: RegistroDiario;
}

/**
 * Inicio del profe: lo que tiene pendiente hoy. Mensajes recientes de sus alumnos, los días
 * que han apuntado para validar y quién lleva días sin apuntar (con un botón para darle un
 * toque). El seguimiento completo de la clase está en la otra pestaña.
 */
export function PanelProfe() {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const desde = sumarDias(hoy, -DIAS_ATRAS);
    const [dossiers, bandeja] = await Promise.all([
      listarDossiers(container.dossiers).then(porAlumno),
      obtenerBandeja(container.incidencias, usuario),
    ]);
    const registros = await Promise.all(
      dossiers.map((d) => listarRegistros(container.registros, d.id, desde, hoy)),
    );
    const recientes: DiaApuntado[] = dossiers
      .flatMap((dossier, i) => registros[i].map((registro) => ({ dossier, registro })))
      .filter(
        ({ registro }) =>
          registro.tipo === 'trabajo' && registro.fecha >= sumarDias(hoy, -DIAS_RECIENTES),
      )
      .sort((a, b) => b.registro.fecha.localeCompare(a.registro.fecha));
    const sinApuntar = alumnosSinApuntar(
      dossiers.map((d, i) => ({
        dossierId: d.id,
        nombre: d.alumnoNombre,
        fechaInicio: d.fechaInicio,
        fechaFin: d.fechaFin,
        fechas: registros[i].map((r) => r.fecha),
      })),
      hoy,
    );
    const inbox = [...bandeja.deMisAlumnos, ...bandeja.mias]
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .slice(0, 5);
    return { dossiers, recientes, sinApuntar, inbox };
  }, [hoy, usuario.id]);
  useRecargarAlVolver(recargar);
  const { width } = useWindowDimensions();
  // En la web horizontal, dos columnas; en el móvil, el orden de la pizarra: inbox, horas y avisos.
  const ancho = Platform.OS === 'web' && width >= 1000;

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={fechaCorta(hoy)}
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {datos && datos.dossiers.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes alumnos con dossier"
          texto="Cuando el instituto te asigne alumnos y tengan su dossier, aquí verás sus mensajes, las horas por validar y quién lleva días sin apuntar."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos && datos.dossiers.length > 0 ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <>
              <HorasPorValidar dias={datos.recientes} />
              <SinApuntar
                alumnos={datos.sinApuntar}
                dossiers={datos.dossiers}
                onCambio={recargar}
              />
            </>
          }
          derecha={<InboxRecientes incidencias={datos.inbox} />}
        />
      ) : null}
    </Pantalla>
  );
}

/** Alumnos que llevan días sin apuntar horas, con un botón para encargarles que se pongan al día. */
function SinApuntar({
  alumnos,
  dossiers,
  onCambio,
}: {
  alumnos: AlumnoSinApuntar[];
  dossiers: Dossier[];
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const [avisados, setAvisados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);

  async function darToque(a: AlumnoSinApuntar) {
    const dossier = dossiers.find((d) => d.id === a.dossierId);
    if (!dossier) return;
    setAviso(null);
    setEnviando(a.dossierId);
    try {
      await crearTarea(container.tareas, usuario, dossier, {
        dossierId: dossier.id,
        ...textoToque(a),
        fechaLimite: hoy,
      });
      setAvisados((v) => [...v, a.dossierId]);
      setAviso({ tipo: 'ok', texto: `${a.nombre} verá el aviso en sus tareas` });
      onCambio();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Tarjeta titulo="Sin apuntar horas">
      {alumnos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todos tus alumnos han apuntado horas en los últimos {DIAS_PARA_AVISAR} días laborables.
        </ThemedText>
      ) : (
        alumnos.map((a) => {
          const avisado = avisados.includes(a.dossierId);
          return (
            <Fila key={a.dossierId}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{a.nombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {a.dias} días laborables sin apuntar ·{' '}
                  {a.ultimo ? `último: ${fechaCorta(a.ultimo)}` : 'aún no ha apuntado ninguno'}
                </ThemedText>
              </View>
              <Boton
                texto={avisado ? 'Avisado ✓' : 'Darle un toque'}
                variante="secundario"
                desactivado={avisado}
                cargando={enviando === a.dossierId}
                onPress={() => darToque(a)}
              />
            </Fila>
          );
        })
      )}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
    </Tarjeta>
  );
}

/**
 * Días de trabajo apuntados en la última semana. Cuando llegue el backend de la doble
 * validación (PC 3), aquí saldrán solo los que ya validó la empresa, con el botón de validar.
 */
function HorasPorValidar({ dias }: { dias: DiaApuntado[] }) {
  return (
    <Tarjeta titulo="Horas por validar">
      <ThemedText type="small" themeColor="textSecondary">
        Días de trabajo apuntados en la última semana. Validarlos desde aquí llega con la doble
        validación (primero la empresa y después tú).
      </ThemedText>
      {dias.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nadie ha apuntado días de trabajo esta semana.
        </ThemedText>
      ) : (
        dias.slice(0, 8).map(({ dossier, registro }) => (
          <Fila
            key={registro.id}
            onPress={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
            etiqueta={`${dossier.alumnoNombre}, ${fechaCorta(registro.fecha)}: ${formatoHoras(totalHoras(registro))}. Ver ficha`}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{dossier.alumnoNombre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {fechaCorta(registro.fecha)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatoHoras(totalHoras(registro))}</ThemedText>
            <Chip texto="Pendiente" color="estadoPendiente" />
          </Fila>
        ))
      )}
    </Tarjeta>
  );
}

/** Últimas incidencias de sus alumnos y las suyas, con acceso a la bandeja del Chat. */
function InboxRecientes({ incidencias }: { incidencias: Incidencia[] }) {
  return (
    <Tarjeta titulo="Inbox recientes">
      {incidencias.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No tienes mensajes nuevos de tus alumnos.
        </ThemedText>
      ) : (
        incidencias.map((i) => (
          <Fila
            key={i.id}
            onPress={() => router.push('/chat')}
            etiqueta={`${i.titulo}, de ${i.creadaPorNombre ?? 'alguien'}, ${TEXTO_ESTADO[i.estado]}. Abrir el chat`}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {i.titulo}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {i.creadaPorNombre ?? 'Sin nombre'} · {fechaCorta(i.creadaEn.slice(0, 10))}
              </ThemedText>
            </View>
            <Chip texto={TEXTO_ESTADO[i.estado]} color={COLOR_ESTADO[i.estado]} />
          </Fila>
        ))
      )}
      <Boton texto="Abrir el chat" variante="secundario" onPress={() => router.push('/chat')} />
    </Tarjeta>
  );
}

/** Fila de una lista dentro de una tarjeta; si se pasa `onPress`, se puede tocar entera. */
function Fila({
  children,
  onPress,
  etiqueta,
}: {
  children: ReactNode;
  onPress?: () => void;
  etiqueta?: string;
}) {
  const theme = useTheme();
  const estilo = [styles.fila, { borderBottomColor: theme.border }];
  if (!onPress) return <View style={estilo}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={estilo}>
      {children}
    </Pressable>
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
        {derecha}
        {izquierda}
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
  flex: { flex: 1, gap: Spacing.half },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
