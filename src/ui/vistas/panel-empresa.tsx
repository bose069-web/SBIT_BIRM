import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import { obtenerSeguimiento, valorarMes, type Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import {
  resumirHoras,
  totalHoras,
  type RegistroDiario,
  type ResumenHoras,
} from '@/core/domain/registro-diario';
import {
  mesDe,
  mesesDelDossier,
  VALORACIONES_MES,
  type ValoracionMes,
} from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useChat } from '@/ui/estado/chat-empresa';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Spacing, type ThemeColor } from '@/ui/theme/theme';
import {
  conversacionesDe,
  hace,
  mensajesDe,
  noLeidos,
  porRecientes,
  type Conversacion,
  type MensajeChat,
} from '@/ui/utils/chat';
import {
  diasHasta,
  fechaCorta,
  formatoHoras,
  hoyISO,
  limitesMes,
  nombreMes,
} from '@/ui/utils/fechas';
import { avisosAlumno, calcularRitmo, type EstadoRitmo, type Ritmo } from '@/ui/utils/ritmo';
import {
  informesPorValidar,
  mesesPorValidar,
  valoracionesConAlumno,
  type InformePendiente,
} from '@/ui/utils/validaciones';

import {
  CabeceraAlumno,
  Cargando,
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  COLOR_VALORACION,
  TEXTO_VALORACION,
  estilosComunes,
  porAlumno,
} from './comun';

interface CargaDossier {
  dossier: Dossier;
  seguimiento: Seguimiento;
  resumen: ResumenHoras;
  /** Último día de trabajo apuntado por el alumno, para ver si va al día. */
  ultimoDia: RegistroDiario | null;
}

/**
 * Inicio de la empresa: lo que tiene que validar, cómo va cada alumno respecto al calendario, a
 * quién conviene mirar, lo último que ha valorado y, al lado, las fechas y los mensajes.
 */
export function PanelEmpresa({
  validar = null,
  mes = null,
}: {
  /** Dossier y mes que se están valorando (`?valorar=<id>&mes=<AAAA-MM>`). */
  validar?: string | null;
  mes?: string | null;
}) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const ancho = useWebAncha();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const todos = await listarDossiers(container.dossiers);
    const mios = porAlumno(todos.filter((d) => d.tutorEmpresaId === usuario.id));
    // Son pocos dossiers (los que tutela esta persona): se piden sus días y su seguimiento.
    return Promise.all(
      mios.map(async (dossier): Promise<CargaDossier> => {
        const [seguimiento, registros] = await Promise.all([
          obtenerSeguimiento(container.valoraciones, dossier, hoy),
          listarRegistros(container.registros, dossier.id, dossier.fechaInicio, dossier.fechaFin),
        ]);
        const ultimoDia = registros
          .filter((r) => r.tipo === 'trabajo')
          .reduce<RegistroDiario | null>(
            (ultimo, r) => (!ultimo || r.fecha > ultimo.fecha ? r : ultimo),
            null,
          );
        return { dossier, seguimiento, resumen: resumirHoras(dossier, registros), ultimoDia };
      }),
    );
  }, [usuario.id, hoy]);
  useRecargarAlVolver(recargar);
  const { mensajes, leidoHasta } = useChat(usuario);

  // Valorar es una subparte de Inicio: se sale de ella volviendo a la pantalla principal.
  if (validar) {
    const elegido = datos?.find((d) => d.dossier.id === validar);
    if (!elegido) {
      return (
        <Pantalla titulo="Valorar el mes" subtitulo="Informes de prácticas">
          <Boton
            texto="‹ Volver a Inicio"
            variante="secundario"
            onPress={() => router.replace('/')}
          />
          {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
          {cargando ? <EsqueletoPanel tarjetas={1} /> : null}
          {!cargando && !error ? (
            <EstadoVacio
              titulo="No se encuentra el alumno"
              texto="Puede que ya no esté en prácticas contigo. Vuelve a Inicio para ver los que tienes."
            />
          ) : null}
        </Pantalla>
      );
    }
    return (
      <Pantalla
        titulo={`Valorar a ${elegido.dossier.alumnoNombre}`}
        subtitulo="Cierra cada mes con tu valoración del trabajo del alumno"
        amplia={ancho}>
        <ValorarDossier
          dossier={elegido.dossier}
          mesInicial={mes}
          onTerminar={() => router.replace('/')}
        />
        {/* Abajo también, para salir sin tener que subir hasta la cabecera. */}
        <Boton
          texto="‹ Volver a Inicio"
          variante="secundario"
          onPress={() => router.replace('/')}
        />
      </Pantalla>
    );
  }

  const informes = informesPorValidar(datos ?? [], hoy);
  const ultimas = valoracionesConAlumno(datos ?? []).slice(0, 4);
  const conversaciones = porRecientes(
    conversacionesDe(
      (datos ?? []).map((d) => d.dossier),
      usuario.id,
    ),
    mensajes,
  );
  const sinLeer = conversaciones.reduce(
    (total, c) => total + noLeidos(mensajes, c.id, leidoHasta[c.id] ?? null, usuario.id),
    0,
  );
  // Cada alumno con su ritmo (lo que debería llevar hoy) y, si hay algo que mirar, sus avisos.
  const ritmos = (datos ?? []).map((carga) => ({
    ...carga,
    ritmo: calcularRitmo(carga.dossier, carga.resumen.realizadas, hoy),
  }));
  const atencion = ritmos
    .map((carga) => ({
      ...carga,
      avisos: avisosAlumno(
        carga.dossier,
        carga.resumen.realizadas,
        carga.ultimoDia?.fecha ?? null,
        hoy,
      ),
    }))
    .filter((carga) => carga.avisos.length > 0)
    .sort(
      (a, b) =>
        b.avisos.length - a.avisos.length ||
        a.dossier.alumnoNombre.localeCompare(b.dossier.alumnoNombre, 'es'),
    );

  const resumen =
    datos && datos.length > 0 ? (
      <View style={styles.chips}>
        <Chip texto={`${datos.length} ${datos.length === 1 ? 'alumno' : 'alumnos'} en prácticas`} />
        <Chip
          texto={informes.length ? `${informes.length} por validar` : 'Todo validado'}
          color={informes.length ? 'estadoPendiente' : 'estadoValidado'}
        />
        {sinLeer ? <Chip texto={`${sinLeer} sin leer`} color="primary" /> : null}
      </View>
    ) : undefined;

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={fechaCorta(hoy)}
      accion={ancho ? resumen : undefined}
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {datos && datos.length === 0 && !cargando ? (
        <EstadoVacio
          titulo="No tienes alumnos asignados"
          texto="Cuando el centro te ponga como tutor de empresa de un alumno, aquí llegarán sus informes para validar y podrás hablar con él y con su profe."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {ancho ? null : resumen}
      {datos && datos.length > 0 ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <>
              <Tarjeta
                titulo="Informes por validar"
                accion={
                  informes.length ? (
                    <Chip texto={`${informes.length}`} color="estadoPendiente" />
                  ) : null
                }>
                {informes.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No hay informes pendientes: todos los meses abiertos están valorados.
                  </ThemedText>
                ) : (
                  <View style={styles.lista}>
                    {informes.map((i) => (
                      <FilaInforme
                        key={`${i.dossier.id}-${i.mes}`}
                        informe={i}
                        onValidar={() => abrirValoracion(i.dossier.id, i.mes)}
                      />
                    ))}
                  </View>
                )}
              </Tarjeta>

              <Tarjeta titulo="Ritmo de los alumnos">
                <ThemedText type="small" themeColor="textSecondary">
                  La marca de la barra son las horas que deberían llevar hoy según su calendario.
                </ThemedText>
                <View style={styles.lista}>
                  {[...ritmos]
                    .sort((a, b) => a.ritmo.desviacion - b.ritmo.desviacion)
                    .map((carga) => (
                      <FilaRitmo
                        key={carga.dossier.id}
                        carga={carga}
                        hoy={hoy}
                        onValorar={() => abrirValoracion(carga.dossier.id, null)}
                      />
                    ))}
                </View>
              </Tarjeta>

              <Tarjeta titulo="Últimas valoraciones">
                {ultimas.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Todavía no has valorado ningún mes de estos alumnos.
                  </ThemedText>
                ) : (
                  <View style={styles.lista}>
                    {ultimas.map(({ dossier, valoracion }) => (
                      <View key={valoracion.id} style={styles.fila}>
                        <View style={styles.filaArriba}>
                          <ThemedText type="smallBold" style={styles.flex}>
                            {dossier.alumnoNombre} · {nombreMes(valoracion.mes)}
                          </ThemedText>
                          <Chip
                            texto={TEXTO_VALORACION[valoracion.valoracion]}
                            color={COLOR_VALORACION[valoracion.valoracion]}
                          />
                        </View>
                        {valoracion.comentario ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {valoracion.comentario}
                          </ThemedText>
                        ) : null}
                        <ThemedText type="small" themeColor="textSecondary">
                          Valorado el {fechaCorta(valoracion.valoradaEn.slice(0, 10))}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </Tarjeta>
            </>
          }
          derecha={
            <>
              <Tarjeta
                titulo="Necesitan atención"
                accion={
                  <Chip
                    texto={atencion.length ? `${atencion.length}` : 'Nadie'}
                    color={atencion.length ? 'estadoPendiente' : 'estadoValidado'}
                  />
                }>
                {atencion.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Nadie necesita atención ahora: todos apuntan sus días y van al ritmo del
                    calendario.
                  </ThemedText>
                ) : (
                  <View style={styles.lista}>
                    {atencion.map(({ dossier, avisos }) => (
                      <Pressable
                        key={dossier.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver la ficha de ${dossier.alumnoNombre}: ${avisos.join(
                          '. ',
                        )}`}
                        onPress={() =>
                          router.push({ pathname: '/', params: { dossier: dossier.id } })
                        }
                        style={({ pressed }) => [
                          styles.fila,
                          styles.pulsable,
                          pressed && styles.pulsada,
                        ]}>
                        <ThemedText type="smallBold">{dossier.alumnoNombre}</ThemedText>
                        {avisos.map((aviso) => (
                          <ThemedText key={aviso} type="small" themeColor="textSecondary">
                            {aviso}
                          </ThemedText>
                        ))}
                      </Pressable>
                    ))}
                  </View>
                )}
              </Tarjeta>

              <Tarjeta titulo="Fechas">
                <Fechas datos={datos} hoy={hoy} pendientes={informes.length} />
              </Tarjeta>

              <Tarjeta
                titulo="Mensajes"
                accion={<Enlace texto="Abrir chat ›" onPress={() => router.navigate('/chat')} />}>
                <Inbox
                  conversaciones={conversaciones}
                  mensajes={mensajes}
                  leidoHasta={leidoHasta}
                  usuarioId={usuario.id}
                />
              </Tarjeta>
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

/** Valorar una subparte de Inicio lleva a la misma ruta con su parámetro. */
function abrirValoracion(dossierId: string, mes: string | null) {
  router.push({
    pathname: '/',
    params: mes ? { valorar: dossierId, mes } : { valorar: dossierId },
  });
}

function FilaInforme({ informe, onValidar }: { informe: InformePendiente; onValidar: () => void }) {
  const { dossier, mes } = informe;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Validar el informe de ${nombreMes(mes)} de ${dossier.alumnoNombre}`}
      onPress={onValidar}
      style={({ pressed }) => [styles.fila, styles.pulsable, pressed && styles.pulsada]}>
      <View style={styles.filaArriba}>
        <ThemedText type="smallBold" style={styles.flex}>
          {dossier.alumnoNombre} · {nombreMes(mes)}
        </ThemedText>
        <Chip texto="Pendiente" color="estadoPendiente" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {[dossier.ciclo, dossier.centro, dossier.empresa].filter(Boolean).join(' · ')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Tutor del centro: {dossier.tutorNombre ?? 'sin asignar'} · Valorar ›
      </ThemedText>
    </Pressable>
  );
}

const TEXTO_ESTADO_RITMO: Record<EstadoRitmo, string> = {
  al_dia: 'Al ritmo',
  por_debajo: 'Por debajo',
  sin_empezar: 'Sin empezar',
  terminadas: 'Terminadas',
};

const COLOR_ESTADO_RITMO: Record<EstadoRitmo, ThemeColor> = {
  al_dia: 'estadoValidado',
  por_debajo: 'estadoPendiente',
  sin_empezar: 'textSecondary',
  terminadas: 'textSecondary',
};

/** Cómo va el alumno frente a su calendario y qué hay que hacer con él. */
function FilaRitmo({
  carga,
  hoy,
  onValorar,
}: {
  carga: CargaDossier & { ritmo: Ritmo };
  hoy: string;
  onValorar: () => void;
}) {
  const { dossier, seguimiento, resumen, ultimoDia, ritmo } = carga;
  const pendientes = mesesPorValidar(dossier, seguimiento, hoy).length;
  return (
    <View style={styles.fila}>
      <CabeceraAlumno
        nombre={dossier.alumnoNombre}
        detalle={[
          [dossier.ciclo, dossier.centro].filter(Boolean).join(' · '),
          `Tutor del centro: ${dossier.tutorNombre ?? 'sin asignar'} · Del ${fechaCorta(
            dossier.fechaInicio,
          )} al ${fechaCorta(dossier.fechaFin)}`,
        ]}
        onAbrir={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
      />
      <View style={styles.progreso}>
        <View style={styles.filaArriba}>
          <ThemedText type="smallBold">
            {formatoHoras(resumen.realizadas)} de {formatoHoras(resumen.totales)}
          </ThemedText>
          <Chip texto={TEXTO_ESTADO_RITMO[ritmo.estado]} color={COLOR_ESTADO_RITMO[ritmo.estado]} />
        </View>
        <BarraProgreso
          porcentaje={resumen.porcentaje}
          marca={ritmo.porcentajeEsperado}
          etiqueta={`Horas de ${dossier.alumnoNombre}`}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {detalleRitmo(ritmo, resumen, dossier)}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {ultimoDia
          ? `Último día apuntado: ${fechaCorta(ultimoDia.fecha)} · ${formatoHoras(
              totalHoras(ultimoDia),
            )}`
          : 'Todavía no ha apuntado ningún día'}
      </ThemedText>
      <View style={styles.filaArriba}>
        {pendientes ? (
          <Chip texto={`${pendientes} por validar`} color="estadoPendiente" />
        ) : (
          <Chip texto="Al día" color="estadoValidado" />
        )}
        <Enlace texto="Valorar meses ›" onPress={onValorar} />
      </View>
    </View>
  );
}

/** Lo que debería llevar hoy, o cómo acabó si ya terminó, para dar sentido a las horas. */
function detalleRitmo(ritmo: Ritmo, resumen: ResumenHoras, dossier: Dossier): string {
  if (ritmo.estado === 'sin_empezar') return `Empieza el ${fechaCorta(dossier.fechaInicio)}`;
  if (ritmo.estado === 'terminadas') {
    return `Acabó con ${formatoHoras(resumen.realizadas)} de ${formatoHoras(resumen.totales)}`;
  }
  const deberia = `Debería llevar ${formatoHoras(ritmo.esperadas)} hoy`;
  if (Math.abs(ritmo.desviacion) < 0.5) return `${deberia} · justo al ritmo`;
  return `${deberia} · ${formatoHoras(Math.abs(ritmo.desviacion))} ${
    ritmo.desviacion > 0 ? 'por delante' : 'por debajo'
  }`;
}

/** Lo que queda de prácticas de cada alumno y cuándo cierra el mes en curso. */
function Fechas({
  datos,
  hoy,
  pendientes,
}: {
  datos: CargaDossier[];
  hoy: string;
  pendientes: number;
}) {
  const theme = useTheme();
  const finDeMes = limitesMes(hoy)[1];
  return (
    <View style={styles.lista}>
      {[...datos]
        .sort((a, b) => a.dossier.fechaFin.localeCompare(b.dossier.fechaFin))
        .map(({ dossier }) => {
          const dias = diasHasta(dossier.fechaFin, hoy);
          return (
            <View key={dossier.id} style={styles.fila}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {dossier.alumnoNombre}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Termina el {fechaCorta(dossier.fechaFin)} ·{' '}
                {dias > 0 ? `faltan ${dias} días` : dias === 0 ? 'es hoy' : 'ya terminó'}
              </ThemedText>
            </View>
          );
        })}
      <View style={[styles.cierre, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          El mes en curso cierra el {fechaCorta(finDeMes)}
        </ThemedText>
        <Chip
          texto={pendientes ? `${pendientes} sin validar` : 'Todo validado'}
          color={pendientes ? 'estadoPendiente' : 'estadoValidado'}
        />
      </View>
    </View>
  );
}

function Inbox({
  conversaciones,
  mensajes,
  leidoHasta,
  usuarioId,
}: {
  conversaciones: Conversacion[];
  mensajes: MensajeChat[];
  leidoHasta: Record<string, string>;
  usuarioId: string;
}) {
  const ultimos = conversaciones
    .flatMap((conversacion) => {
      const delHilo = mensajesDe(mensajes, conversacion.id);
      const ultimo = delHilo[delHilo.length - 1];
      return ultimo ? [{ conversacion, mensaje: ultimo }] : [];
    })
    .sort((a, b) => b.mensaje.enviadoEn.localeCompare(a.mensaje.enviadoEn))
    .slice(0, 4);

  if (ultimos.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Todavía no hay mensajes de tus alumnos ni de sus profes.
      </ThemedText>
    );
  }

  return (
    <View style={styles.lista}>
      {ultimos.map(({ conversacion, mensaje }) => {
        const nuevos = noLeidos(
          mensajes,
          conversacion.id,
          leidoHasta[conversacion.id] ?? null,
          usuarioId,
        );
        return (
          <Pressable
            key={`${conversacion.id}-${mensaje.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Abrir el chat con ${conversacion.titulo}`}
            onPress={() =>
              router.push({ pathname: '/chat', params: { conversacion: conversacion.id } })
            }
            style={({ pressed }) => [styles.fila, styles.pulsable, pressed && styles.pulsada]}>
            <View style={styles.filaArriba}>
              <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                {conversacion.titulo}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {hace(mensaje.enviadoEn)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {mensaje.autorId === usuarioId ? 'Tú: ' : ''}
              {mensaje.texto}
            </ThemedText>
            {nuevos ? <Chip texto={`${nuevos} sin leer`} color="estadoPendiente" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pulsada}>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Dos columnas en la web ancha; en el móvil, todo seguido. */
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

/** Valoración de los meses de un alumno, con su historial. */
function ValorarDossier({
  dossier,
  mesInicial,
  onTerminar,
}: {
  dossier: Dossier;
  mesInicial: string | null;
  onTerminar: () => void;
}) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, recargar } = useDatos(
    () => obtenerSeguimiento(container.valoraciones, dossier, hoy),
    [dossier.id, hoy],
  );
  const meses = mesesDelDossier(dossier).filter((m) => m <= mesDe(hoy));
  const [mes, setMes] = useState<string | null>(mesInicial);
  const [valoracion, setValoracion] = useState<ValoracionMes | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const mesElegido = mes ?? datos?.sinValorar[0] ?? meses[meses.length - 1] ?? null;

  async function guardar() {
    if (!mesElegido || !valoracion) {
      setAviso({ tipo: 'error', texto: 'Elige el mes y la valoración' });
      return;
    }
    setAviso(null);
    setGuardando(true);
    try {
      await valorarMes(
        container.valoraciones,
        usuario,
        dossier,
        {
          dossierId: dossier.id,
          mes: mesElegido,
          valoracion,
          comentario,
        },
        hoy,
      );
      setAviso({ tipo: 'ok', texto: `Valorado ${nombreMes(mesElegido)}` });
      setValoracion(null);
      setComentario('');
      setMes(null);
      recargar();
      onTerminar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta>
      <CabeceraAlumno
        nombre={dossier.alumnoNombre}
        detalle={[
          [dossier.ciclo, dossier.centro].filter(Boolean).join(' · '),
          `Tutor del centro: ${dossier.tutorNombre ?? 'sin asignar'}`,
          `Del ${fechaCorta(dossier.fechaInicio)} al ${fechaCorta(dossier.fechaFin)}`,
        ]}
      />
      {error && !datos ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {!datos && !error ? <Cargando texto="Cargando valoraciones…" /> : null}
      {datos && datos.sinValorar.length > 0 ? (
        <Chip
          texto={`Pendiente de valorar: ${datos.sinValorar.map(nombreMes).join(', ')}`}
          color="estadoPendiente"
        />
      ) : datos && meses.length > 0 && !datos.final ? (
        <Chip texto="Todos los meses acabados están valorados" color="estadoValidado" />
      ) : null}
      {!datos ? null : datos.final ? (
        <ThemedText type="small" themeColor="textSecondary">
          El profe ya ha puesto la valoración final: ya no se pueden cambiar los meses.
        </ThemedText>
      ) : meses.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Las prácticas empiezan el {fechaCorta(dossier.fechaInicio)}. Podrás valorar cuando empiece
          el primer mes.
        </ThemedText>
      ) : (
        <>
          <Selector
            etiqueta="Mes"
            opciones={meses.map((m) => ({ valor: m, texto: nombreMes(m) }))}
            valor={mesElegido}
            onCambio={setMes}
          />
          <Selector
            etiqueta="Valoración"
            opciones={VALORACIONES_MES.map((v) => ({ valor: v, texto: TEXTO_VALORACION[v] }))}
            valor={valoracion}
            onCambio={setValoracion}
          />
          <Campo
            etiqueta="Comentario"
            multiline
            value={comentario}
            onChangeText={setComentario}
            ayuda="Obligatorio si la valoración no es positiva. Al valorar, el mes se cierra para el alumno."
          />
          {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
          <Boton texto="Guardar valoración" onPress={guardar} cargando={guardando} />
        </>
      )}

      {datos ? (
        <>
          <ThemedText type="smallBold" style={estilosComunes.capital}>
            Historial
          </ThemedText>
          <ListaValoraciones mensuales={datos.mensuales} final={datos.final} />
        </>
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  lista: { gap: Spacing.two },
  fila: { gap: Spacing.one, paddingVertical: Spacing.two, paddingHorizontal: Spacing.one },
  pulsable: { borderRadius: 12 },
  filaArriba: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progreso: { gap: Spacing.one },
  cierre: { gap: Spacing.one, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  pulsada: { opacity: 0.6 },
  flex: { flex: 1 },
});
