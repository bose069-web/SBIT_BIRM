import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import { obtenerBandeja } from '@/core/application/incidencias';
import { listarRegistros } from '@/core/application/registro-diario';
import { crearTarea, listarTareas } from '@/core/application/tareas';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import type { Incidencia } from '@/core/domain/incidencia';
import { totalHoras } from '@/core/domain/registro-diario';
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
  agruparPorAlumno,
  alumnosSinApuntar,
  DIAS_PARA_AVISAR,
  textoToque,
  toquePendiente,
  type AlumnoSinApuntar,
  type DiasDeAlumno,
} from '@/ui/utils/avisos-profe';
import { fechaCorta, formatoHoras, hoyISO, nombreMes, sumarDias } from '@/ui/utils/fechas';

import { ErrorCarga, EsqueletoPanel, EstadoVacio, porAlumno } from './comun';
import { COLOR_ESTADO, TEXTO_ESTADO } from './incidencias';

/** Cuántos días hacia atrás se miran los registros de los alumnos. */
const DIAS_ATRAS = 45;
/** Días recientes que se enseñan en "Horas por validar". */
const DIAS_RECIENTES = 7;

interface FaltaValorar {
  dossierId: string;
  nombre: string;
  empresa: string | null;
  meses: string[];
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
    const recientes = agruparPorAlumno(
      dossiers.flatMap((d, i) =>
        registros[i]
          .filter((r) => r.tipo === 'trabajo' && r.fecha >= sumarDias(hoy, -DIAS_RECIENTES))
          .map((r) => ({
            dossierId: d.id,
            nombre: d.alumnoNombre,
            fecha: r.fecha,
            horas: totalHoras(r),
          })),
      ),
    );
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
    // Toque ya dado y aún sin cumplir, para no repetirlo; y meses que la empresa no ha valorado.
    const [tareas, seguimientos] = await Promise.all([
      Promise.all(sinApuntar.map((a) => listarTareas(container.tareas, a.dossierId))),
      Promise.all(dossiers.map((d) => obtenerSeguimiento(container.valoraciones, d, hoy))),
    ]);
    const toques: Record<string, string | null> = Object.fromEntries(
      sinApuntar.map((a, i) => [a.dossierId, toquePendiente(tareas[i])]),
    );
    const faltaValorar: FaltaValorar[] = dossiers
      .map((d, i) => ({
        dossierId: d.id,
        nombre: d.alumnoNombre,
        empresa: d.empresa,
        meses: seguimientos[i].sinValorar,
      }))
      .filter((f) => f.meses.length > 0);
    const inbox = [...bandeja.deMisAlumnos, ...bandeja.mias]
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .slice(0, 5);
    const pendientesInbox = [...bandeja.deMisAlumnos, ...bandeja.mias].filter(
      (i) => i.estado !== 'resuelta',
    ).length;
    return { dossiers, recientes, sinApuntar, toques, faltaValorar, inbox, pendientesInbox };
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
        <>
          <Cifras
            elementos={[
              {
                valor: datos.recientes.reduce((t, a) => t + a.dias, 0),
                texto: 'días por validar',
              },
              { valor: datos.sinApuntar.length, texto: 'sin apuntar horas', aviso: true },
              { valor: datos.pendientesInbox, texto: 'mensajes abiertos' },
            ]}
          />
          <Columnas
            ancho={ancho}
            izquierda={
              <>
                <HorasPorValidar alumnos={datos.recientes} />
                <SinApuntar
                  alumnos={datos.sinApuntar}
                  toques={datos.toques}
                  dossiers={datos.dossiers}
                  onCambio={recargar}
                />
              </>
            }
            derecha={
              <>
                <InboxRecientes incidencias={datos.inbox} />
                {datos.faltaValorar.length > 0 ? (
                  <FaltaValorarEmpresa alumnos={datos.faltaValorar} />
                ) : null}
              </>
            }
          />
        </>
      ) : null}
    </Pantalla>
  );
}

/** Alumnos que llevan días sin apuntar horas, con un botón para encargarles que se pongan al día. */
function SinApuntar({
  alumnos,
  toques,
  dossiers,
  onCambio,
}: {
  alumnos: AlumnoSinApuntar[];
  /** Día del toque que cada alumno aún no ha cumplido (por dossier). */
  toques: Record<string, string | null>;
  dossiers: Dossier[];
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const hoy = hoyISO();
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
          const toque = toques[a.dossierId];
          return (
            <Fila key={a.dossierId}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{a.nombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {a.dias} días laborables sin apuntar ·{' '}
                  {a.ultimo ? `último: ${fechaCorta(a.ultimo)}` : 'aún no ha apuntado ninguno'}
                </ThemedText>
              </View>
              {toque !== undefined && toque !== null ? (
                <Chip
                  texto={toque ? `Toque el ${fechaCorta(toque)}` : 'Toque dado'}
                  color="estadoPendiente"
                />
              ) : (
                <Boton
                  texto="Darle un toque"
                  variante="secundario"
                  cargando={enviando === a.dossierId}
                  onPress={() => darToque(a)}
                />
              )}
            </Fila>
          );
        })
      )}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
    </Tarjeta>
  );
}

/**
 * Días de trabajo apuntados en la última semana, por alumno. Cuando llegue el backend de la
 * doble validación (PC 3), aquí saldrán solo los que ya validó la empresa, con un botón para
 * validarlos todos de una vez.
 */
function HorasPorValidar({ alumnos }: { alumnos: DiasDeAlumno[] }) {
  return (
    <Tarjeta titulo="Horas por validar">
      {alumnos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nadie ha apuntado días de trabajo esta semana.
        </ThemedText>
      ) : (
        alumnos.map((a) => (
          <Fila
            key={a.dossierId}
            onPress={() => router.push({ pathname: '/', params: { dossier: a.dossierId } })}
            etiqueta={`${a.nombre}: ${a.dias} días, ${formatoHoras(a.horas)}. Ver ficha`}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{a.nombre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {a.dias} {a.dias === 1 ? 'día' : 'días'} · último el {fechaCorta(a.ultimo)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatoHoras(a.horas)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </Fila>
        ))
      )}
    </Tarjeta>
  );
}

/** Alumnos con meses acabados que su empresa aún no ha valorado: el profe se lo reclama. */
function FaltaValorarEmpresa({ alumnos }: { alumnos: FaltaValorar[] }) {
  return (
    <Tarjeta titulo="Falta la valoración de la empresa">
      {alumnos.map((a) => (
        <Fila
          key={a.dossierId}
          onPress={() => router.push({ pathname: '/', params: { dossier: a.dossierId } })}
          etiqueta={`${a.nombre}: ${a.empresa ?? 'su empresa'} no ha valorado ${a.meses.map(nombreMes).join(', ')}. Ver ficha`}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{a.nombre}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {a.empresa ?? 'Sin empresa'} · {a.meses.map(nombreMes).join(', ')}
            </ThemedText>
          </View>
        </Fila>
      ))}
    </Tarjeta>
  );
}

/** Tres cifras de un vistazo: si todas están a 0, no hay nada pendiente. */
function Cifras({ elementos }: { elementos: { valor: number; texto: string; aviso?: boolean }[] }) {
  return (
    <Tarjeta>
      <View style={styles.cifras}>
        {elementos.map((e) => (
          <View
            key={e.texto}
            style={styles.cifra}
            accessible
            accessibilityLabel={`${e.valor} ${e.texto}`}>
            <ThemedText
              type="title"
              themeColor={e.aviso && e.valor > 0 ? 'estadoPendiente' : 'text'}>
              {e.valor}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {e.texto}
            </ThemedText>
          </View>
        ))}
      </View>
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
  cifras: { flexDirection: 'row', gap: Spacing.three },
  cifra: { flex: 1, gap: Spacing.half },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
