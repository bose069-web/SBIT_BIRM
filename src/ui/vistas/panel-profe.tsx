import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers, obtenerResumenHoras } from '@/core/application/dossier';
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
import { Quesito } from '@/ui/components/quesito';
import { Tarjeta } from '@/ui/components/tarjeta';
import { TarjetaPendientes } from '@/ui/components/tarjeta-pendientes';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Spacing, type ThemeColor } from '@/ui/theme/theme';
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
import { pendientesProfe } from '@/ui/utils/pendientes';
import { nivelSinApuntar, type NivelAviso } from '@/ui/utils/progreso';

import { ProximasFechas } from './agenda';
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

interface Progreso {
  dossierId: string;
  nombre: string;
  porcentaje: number;
}

// Igual que en el Inicio del alumno: cuanto más tiempo sin apuntar, más llamativo.
const COLOR_AVISO: Record<NivelAviso, ThemeColor | null> = {
  ninguno: null,
  leve: 'avisoLeve',
  medio: 'avisoMedio',
  grave: 'danger',
};

/**
 * Inicio del profe: lo que tiene pendiente hoy. Arriba, cómo va su clase de un vistazo; debajo,
 * los días por validar, quién lleva días sin apuntar (con un botón para darle un toque) y los
 * mensajes recientes. El seguimiento completo de cada alumno está en la pestaña Seguimiento.
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
    const [registros, resumenes, seguimientos] = await Promise.all([
      Promise.all(dossiers.map((d) => listarRegistros(container.registros, d.id, desde, hoy))),
      Promise.all(dossiers.map((d) => obtenerResumenHoras(d, container.registros))),
      Promise.all(dossiers.map((d) => obtenerSeguimiento(container.valoraciones, d, hoy))),
    ]);
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
    // Toque ya dado y aún sin cumplir, para no repetirlo.
    const tareas = await Promise.all(
      sinApuntar.map((a) => listarTareas(container.tareas, a.dossierId)),
    );
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
    const progresos: Progreso[] = dossiers
      .map((d, i) => ({
        dossierId: d.id,
        nombre: d.alumnoNombre,
        porcentaje: resumenes[i].porcentaje,
      }))
      .sort((a, b) => a.porcentaje - b.porcentaje);
    const todas = [...bandeja.deMisAlumnos, ...bandeja.mias];
    const inbox = [...todas].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)).slice(0, 4);
    const mensajesAbiertos = todas.filter((i) => i.estado !== 'resuelta').length;
    return {
      dossiers,
      recientes,
      sinApuntar,
      toques,
      faltaValorar,
      progresos,
      inbox,
      mensajesAbiertos,
      deMisAlumnos: bandeja.deMisAlumnos,
    };
  }, [hoy, usuario.id]);
  useRecargarAlVolver(recargar);
  // En la web horizontal el panel se reparte en dos columnas; en el móvil, una debajo de otra.
  const ancho = useWebAncha();
  const alumnos = datos?.dossiers.length ?? 0;

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={
        datos
          ? `${fechaCorta(hoy)} · ${alumnos} ${alumnos === 1 ? 'alumno' : 'alumnos'}`
          : fechaCorta(hoy)
      }
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {datos && alumnos === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes alumnos con dossier"
          texto="Cuando el instituto te asigne alumnos y tengan su dossier, aquí verás sus mensajes, las horas por validar y quién lleva días sin apuntar."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos && alumnos > 0 ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <>
              <TarjetaPendientes
                pendientes={pendientesProfe({
                  incidencias: datos.deMisAlumnos,
                  sinApuntar: datos.sinApuntar,
                  faltaValorar: datos.faltaValorar,
                })}
                textoAlDia="Sin incidencias abiertas de tus alumnos, días sin apuntar ni meses sin valorar."
              />
              <TuClase
                ancho={ancho}
                progresos={datos.progresos}
                porValidar={datos.recientes.reduce((t, a) => t + a.dias, 0)}
                sinApuntar={datos.sinApuntar}
                mensajes={datos.mensajesAbiertos}
              />
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
              <Tarjeta
                titulo="Próximas fechas"
                accion={
                  <Enlace texto="Seguimiento ›" onPress={() => router.navigate('/calendario')} />
                }>
                <ProximasFechas hoy={hoy} />
              </Tarjeta>
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

/** Cómo va la clase de un vistazo: progreso medio y las tres cosas pendientes de hoy. */
function TuClase({
  ancho,
  progresos,
  porValidar,
  sinApuntar,
  mensajes,
}: {
  ancho: boolean;
  progresos: Progreso[];
  porValidar: number;
  sinApuntar: AlumnoSinApuntar[];
  mensajes: number;
}) {
  const theme = useTheme();
  const media = progresos.length
    ? Math.round(progresos.reduce((t, p) => t + p.porcentaje, 0) / progresos.length)
    : 0;
  const masAtrasado = progresos[0];
  const peor = sinApuntar[0]?.dias ?? 0;
  const colorSinApuntar = COLOR_AVISO[nivelSinApuntar(peor)];
  return (
    <Tarjeta
      titulo="Tu clase"
      accion={<Enlace texto="Seguimiento ›" onPress={() => router.navigate('/calendario')} />}>
      <View style={[styles.clase, !ancho && styles.claseMovil]}>
        <View style={styles.quesito}>
          <Quesito porcentaje={media} etiqueta="Progreso medio de horas de tu clase" />
          <View style={ancho ? undefined : styles.flex}>
            <ThemedText type="title">{media}%</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              de las horas, de media
            </ThemedText>
          </View>
        </View>
        <View style={[styles.datos, ancho && styles.flex]}>
          <View style={styles.cifras}>
            <Cifra
              etiqueta="Por validar"
              valor={`${porValidar} ${porValidar === 1 ? 'día' : 'días'}`}
            />
            <Cifra
              etiqueta="Alumnos sin apuntar"
              valor={String(sinApuntar.length)}
              color={colorSinApuntar ? theme[colorSinApuntar] : undefined}
            />
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${mensajes} mensajes abiertos. Abrir el chat`}
              onPress={() => router.navigate('/chat')}
              style={({ pressed }) => [styles.flex, pressed && { opacity: 0.6 }]}>
              <Cifra etiqueta="Mensajes" valor={`${mensajes} ›`} />
            </Pressable>
          </View>
          {masAtrasado && progresos.length > 1 ? (
            <ThemedText type="small">
              Va más atrasado {masAtrasado.nombre}, con el {masAtrasado.porcentaje}% de las horas
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Tarjeta>
  );
}

/**
 * Días de trabajo apuntados en la última semana, por alumno. Cuando llegue el backend de la
 * doble validación (PC 3), aquí saldrán solo los que ya validó la empresa, con un botón para
 * validarlos todos de una vez.
 */
function HorasPorValidar({ alumnos }: { alumnos: DiasDeAlumno[] }) {
  const ancho = useWebAncha();
  return (
    <Tarjeta titulo="Horas por validar">
      {alumnos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nadie ha apuntado días de trabajo esta semana.
        </ThemedText>
      ) : (
        <View>
          {alumnos.map((a, i) => (
            <Fila
              key={a.dossierId}
              primera={i === 0}
              onPress={() => router.push({ pathname: '/', params: { dossier: a.dossierId } })}
              etiqueta={`${a.nombre}: ${a.dias} días, ${formatoHoras(a.horas)}. Ver ficha`}>
              {/* En el móvil, nombre arriba y detalle debajo para que no se apriete. */}
              <View style={[styles.flex, ancho && styles.enLinea]}>
                <ThemedText type="smallBold" style={ancho ? styles.flex : undefined}>
                  {a.nombre}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {a.dias} {a.dias === 1 ? 'día' : 'días'} · {formatoHoras(a.horas)} · último el{' '}
                  {fechaCorta(a.ultimo)}
                </ThemedText>
              </View>
            </Fila>
          ))}
        </View>
      )}
    </Tarjeta>
  );
}

/** Alumnos que llevan días sin apuntar horas, con un botón para darles un toque. */
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
  const theme = useTheme();
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
        <View>
          {alumnos.map((a, i) => {
            const toque = toques[a.dossierId];
            const color = COLOR_AVISO[nivelSinApuntar(a.dias)];
            return (
              <Fila key={a.dossierId} primera={i === 0}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{a.nombre}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {a.ultimo
                      ? `Último día: ${fechaCorta(a.ultimo)}`
                      : 'Aún no ha apuntado ninguno'}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={color ? { color: theme[color] } : undefined}>
                  {a.dias} días
                </ThemedText>
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
          })}
        </View>
      )}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
    </Tarjeta>
  );
}

/** Últimas incidencias de sus alumnos y las suyas, con acceso a la bandeja del Chat. */
function InboxRecientes({ incidencias }: { incidencias: Incidencia[] }) {
  return (
    <Tarjeta
      titulo="Inbox recientes"
      accion={<Enlace texto="Abrir chat ›" onPress={() => router.navigate('/chat')} />}>
      {incidencias.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No tienes mensajes nuevos de tus alumnos.
        </ThemedText>
      ) : (
        <View>
          {incidencias.map((i, n) => (
            <Fila
              key={i.id}
              primera={n === 0}
              onPress={() => router.navigate('/chat')}
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
          ))}
        </View>
      )}
    </Tarjeta>
  );
}

/** Alumnos con meses acabados que su empresa aún no ha valorado: el profe se lo reclama. */
function FaltaValorarEmpresa({ alumnos }: { alumnos: FaltaValorar[] }) {
  return (
    <Tarjeta titulo="Falta la valoración de la empresa">
      <View>
        {alumnos.map((a, i) => (
          <Fila
            key={a.dossierId}
            primera={i === 0}
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
      </View>
    </Tarjeta>
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

/** Fila de una lista (línea fina entre filas, como en el Inicio del alumno); tocable si hay `onPress`. */
function Fila({
  children,
  primera,
  onPress,
  etiqueta,
}: {
  children: ReactNode;
  primera: boolean;
  onPress?: () => void;
  etiqueta?: string;
}) {
  const theme = useTheme();
  const borde = primera ? null : { borderTopWidth: 1, borderColor: theme.border };
  if (!onPress) return <View style={[styles.fila, borde]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, borde, pressed && { opacity: 0.6 }]}>
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
  flex: { flex: 1 },
  clase: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  claseMovil: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.three },
  quesito: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  datos: { gap: Spacing.two },
  cifras: { flexDirection: 'row', gap: Spacing.three },
  enLinea: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
});
