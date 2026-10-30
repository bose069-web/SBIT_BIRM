import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { obtenerPanelCentro, type PanelCentro } from '@/core/application/centro';
import { listarDossiers, obtenerResumenHoras, puedeCrearDossier } from '@/core/application/dossier';
import {
  obtenerSeguimiento,
  ponerValoracionFinal,
  type Seguimiento,
} from '@/core/application/valoracion';
import { estaEnPeriodo, type Dossier } from '@/core/domain/dossier';
import type { ResumenHoras } from '@/core/domain/registro-diario';
import { gestionaDossier, type Rol } from '@/core/domain/usuario';
import { RESULTADOS_FINALES, type ResultadoFinal } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { GraficoBarras } from '@/ui/components/grafico-barras';
import { Leyenda } from '@/ui/components/leyenda';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Quesito } from '@/ui/components/quesito';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import {
  avisosSeguimiento,
  ETIQUETA_AVISO,
  type AvisoSeguimiento,
} from '@/ui/utils/avisos-seguimiento';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';
import { profesConAlumnos } from '@/ui/utils/reparto-profes';
import {
  barrasProgreso,
  resumirSeguimiento,
  type AlumnoSeguido,
} from '@/ui/utils/seguimiento-profe';

import { NuevoEvento, ProximasFechas } from './agenda';
import { TareasDossier } from './tareas';
import {
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  TEXTO_RESULTADO,
  porAlumno,
} from './comun';

const SUBTITULO: Partial<Record<Rol, string>> = {
  profe: 'Tus alumnos: horas, valoraciones de la empresa y valoración final',
  instituto: 'Las cifras de tu centro, sus profes y sus alumnos',
  generalitat: 'Todos los institutos',
};

/**
 * Seguimiento de varios dossiers. La base de datos decide cuáles ve cada uno: el profe, los de
 * sus alumnos; el instituto, los de su centro; la generalitat, todos.
 * El instituto, además, su panel de gestión: cifras, avisos y alumnos agrupados por profe.
 */
interface DatosAlumno {
  resumen: ResumenHoras;
  seguimiento: Seguimiento;
}

interface DetalleDossier {
  dossier: Dossier;
  datos: DatosAlumno;
}

interface DatosSeguimiento {
  /** Solo el instituto (su centro); el resto de roles, null. */
  panel: PanelCentro | null;
  detalles: DetalleDossier[];
  avisos: AvisoSeguimiento[];
}

export function SeguimientoProfe() {
  const usuario = useUsuario();
  const { rol } = usuario;
  const hoy = hoyISO();
  const esInstituto = rol === 'instituto';
  const creaDossiers = !!usuario.centroId && puedeCrearDossier(usuario, usuario.centroId);
  const administra = rol === 'instituto' || rol === 'generalitat';
  // Se cargan aquí las horas y valoraciones de todos para poder hacer el resumen del lateral.
  const { datos, error, cargando, recargar } = useDatos(async (): Promise<DatosSeguimiento> => {
    // El instituto, además de los dossiers de su centro, el panel: profes, alumnos y convenios.
    const [crud, panel] = await Promise.all([
      listarDossiers(container.dossiers),
      esInstituto && usuario.centroId
        ? obtenerPanelCentro(container.centros, usuario, usuario.centroId)
        : null,
    ]);
    const dossiers = porAlumno(crud);
    const detalles = await Promise.all(
      dossiers.map(async (dossier): Promise<DetalleDossier> => {
        const [resumen, seguimiento] = await Promise.all([
          obtenerResumenHoras(dossier, container.registros),
          obtenerSeguimiento(container.valoraciones, dossier, hoy),
        ]);
        return { dossier, datos: { resumen, seguimiento } };
      }),
    );
    // A diario, quién dejó de apuntar: eso ya está en el panel de gestión; aquí, el resto.
    const avisos = avisosSeguimiento(
      detalles.map(({ dossier, datos: d }) => ({
        alumno: dossier.alumnoNombre,
        diasSinApuntar: 0,
        mesesSinValorar: d.seguimiento.sinValorar,
        porcentaje: d.resumen.porcentaje,
        terminado: hoy > dossier.fechaFin,
        tieneFinal: !!d.seguimiento.final,
      })),
    );
    return { panel, detalles, avisos };
  }, [hoy, esInstituto, usuario.centroId, usuario.id]);
  useRecargarAlVolver(recargar);
  // En la web horizontal, alumnos a la izquierda y resumen a la derecha; en el móvil, seguido.
  const ancho = useWebAncha();

  const detalles = datos?.detalles ?? [];
  const alumnos: AlumnoSeguido[] = detalles.map(({ dossier, datos: d }) => ({
    nombre: dossier.alumnoNombre,
    porcentaje: d.resumen.porcentaje,
    mesesSinValorar: d.seguimiento.sinValorar.length,
    tieneFinal: !!d.seguimiento.final,
  }));

  const acciones =
    administra || creaDossiers ? (
      <View style={ancho ? styles.acciones : styles.accionesMovil}>
        {administra ? (
          <Boton
            texto={rol === 'generalitat' ? 'Gestionar institutos' : 'Gestionar el centro'}
            variante="secundario"
            onPress={() => router.push('/centro')}
          />
        ) : null}
        {creaDossiers ? (
          <Boton
            texto="+ Nuevo dossier"
            onPress={() => router.push({ pathname: '/', params: { nuevo: '1' } })}
          />
        ) : null}
      </View>
    ) : null;
  // Del que va más atrasado al más avanzado: lo primero que ve el profe es a quién atender.
  const ordenados = [...detalles].sort(
    (a, b) => a.datos.resumen.porcentaje - b.datos.resumen.porcentaje,
  );

  return (
    <Pantalla
      titulo="Seguimiento"
      subtitulo={SUBTITULO[rol]}
      // En la web, las acciones junto al título, como el estado del mes en el Inicio del alumno.
      accion={ancho ? acciones : undefined}
      amplia={ancho}>
      {ancho ? null : acciones}
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel /> : null}
      {/* Arriba, a lo ancho: el centro de un vistazo y qué atender (solo el instituto). */}
      {datos?.panel ? (
        <>
          <CifrasCentro panel={datos.panel} dossiers={detalles.map((d) => d.dossier)} hoy={hoy} />
          <AvisosInicio panel={datos.panel} detalles={detalles} avisos={datos.avisos} />
        </>
      ) : null}
      {datos && datos.detalles.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay alumnos con dossier"
          texto="Cuando tus alumnos tengan su dossier de prácticas, aquí verás sus horas, las valoraciones de la empresa y podrás poner la valoración final."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos && datos.detalles.length > 0 ? (
        <Columnas
          ancho={ancho}
          izquierda={
            // El instituto piensa en profes; el profe y la generalitat, en su lista de alumnos.
            datos.panel ? (
              <ProfesDelCentro panel={datos.panel} detalles={detalles} onCambio={recargar} />
            ) : (
              <Tarjeta titulo={`Alumnos (${datos.detalles.length})`}>
                <View>
                  {ordenados.map(({ dossier, datos: d }, i) => (
                    <FilaAlumno
                      key={dossier.id}
                      primera={i === 0}
                      dossier={dossier}
                      datos={d}
                      onCambio={recargar}
                    />
                  ))}
                </View>
              </Tarjeta>
            )
          }
          derecha={
            <>
              <ResumenAlumnos alumnos={alumnos} />
              <Tarjeta titulo="Próximas fechas">
                <ProximasFechas hoy={hoy} />
              </Tarjeta>
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

/**
 * Solo el instituto: las cifras del centro arriba, como el alumno en su Inicio. Los dossiers
 * activos son los que siguen dentro de su fechas (el resto, ya cerrados).
 */
function CifrasCentro({
  panel,
  dossiers,
  hoy,
}: {
  panel: PanelCentro;
  dossiers: Dossier[];
  hoy: string;
}) {
  const activos = dossiers.filter((d) => estaEnPeriodo(d, hoy)).length;
  const cifras = [
    { etiqueta: 'alumnos', valor: panel.alumnos.length },
    { etiqueta: 'dossiers activos', valor: activos },
    { etiqueta: 'profes', valor: panel.profes.length },
    { etiqueta: 'convenios', valor: panel.convenios.length },
  ];
  return (
    <Tarjeta titulo="El centro en cifras">
      <View style={styles.cifras}>
        {cifras.map((c) => (
          <Cifra key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} />
        ))}
      </View>
    </Tarjeta>
  );
}

/**
 * Solo el instituto: lo que necesita atención de un vistazo. Primero los huecos de gestión
 * (sin profe, sin dossier), luego los avisos de seguimiento; si no hay nada, lo dice.
 */
function AvisosInicio({
  panel,
  detalles,
  avisos,
}: {
  panel: PanelCentro;
  detalles: DetalleDossier[];
  avisos: AvisoSeguimiento[];
}) {
  const conDossier = new Set(detalles.map(({ dossier }) => dossier.alumnoId));
  const sinProfe = panel.alumnos.filter((a) => !a.profeId).length;
  const sinDossier = panel.alumnos.filter((a) => !conDossier.has(a.id)).length;
  const vacio = sinProfe === 0 && sinDossier === 0 && avisos.length === 0;
  return (
    <Tarjeta titulo="Qué necesita tu atención">
      {vacio ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todo en orden: nada pendiente en el centro.
        </ThemedText>
      ) : (
        <>
          {sinProfe > 0 ? (
            <Chip texto={`${sinProfe} sin profe asignado`} color="estadoPendiente" />
          ) : null}
          {sinDossier > 0 ? (
            <Chip texto={`${sinDossier} sin dossier`} color="estadoPendiente" />
          ) : null}
          {avisos.map((a, i) => (
            <Fila key={`${a.tipo}-${a.alumno}-${i}`} titulo={a.alumno} detalle={a.motivo}>
              <Chip texto={ETIQUETA_AVISO[a.tipo]} color={a.color} />
            </Fila>
          ))}
        </>
      )}
    </Tarjeta>
  );
}

/**
 * Solo el instituto: una sección por profe con sus alumnos; cada uno con su quesito y horas.
 * Los alumnos sin dossier y los profes sin alumnos salen igual, para que no se quede nada oculto.
 */
function ProfesDelCentro({
  panel,
  detalles,
  onCambio,
}: {
  panel: PanelCentro;
  detalles: DetalleDossier[];
  onCambio: () => void;
}) {
  const theme = useTheme();
  // Un alumno con varios dossiers se queda con el primero; cada dossier tiene su ficha propia.
  const porAlumnoId = new Map<string, DetalleDossier>();
  for (const d of detalles) {
    if (!porAlumnoId.has(d.dossier.alumnoId)) porAlumnoId.set(d.dossier.alumnoId, d);
  }
  const secciones = profesConAlumnos(panel.profes, panel.alumnos);
  return (
    <Tarjeta titulo={`Profes del centro (${panel.profes.length})`}>
      {secciones.map((s, si) => (
        <View
          key={s.profe?.id ?? 'sin-profe'}
          style={[styles.seccion, si > 0 && { borderTopWidth: 1, borderColor: theme.border }]}>
          <View style={styles.seccionCabecera}>
            <ThemedText type="smallBold">
              {s.profe ? s.profe.nombre : 'Sin profe asignado'} ({s.alumnos.length})
            </ThemedText>
            {s.profe && s.alumnos.length === 0 ? (
              <Chip texto="Sin alumnos" color="estadoPendiente" />
            ) : null}
          </View>
          {s.alumnos.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no tiene alumnos.
            </ThemedText>
          ) : (
            s.alumnos.map((a, i) => {
              const con = porAlumnoId.get(a.id);
              if (!con) {
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.alumno,
                      i > 0 && { borderTopWidth: 1, borderColor: theme.border },
                    ]}>
                    <View style={styles.fila}>
                      <View style={styles.flex}>
                        <ThemedText type="smallBold">{a.nombre}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {a.email}
                        </ThemedText>
                      </View>
                      <Chip texto="Sin dossier" color="estadoPendiente" />
                    </View>
                  </View>
                );
              }
              return (
                <FilaAlumno
                  key={con.dossier.id}
                  primera={i === 0}
                  dossier={con.dossier}
                  datos={con.datos}
                  onCambio={onCambio}
                />
              );
            })
          )}
        </View>
      ))}
    </Tarjeta>
  );
}

/** Una fila de motivo con su chip a la derecha, como en el panel de gestión del instituto. */
function Fila({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.filaAviso, { borderColor: theme.border }]}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detalle}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

/** Resumen de todos los alumnos: progreso medio, quién va atrasado y qué falta por valorar. */
function ResumenAlumnos({ alumnos }: { alumnos: AlumnoSeguido[] }) {
  const theme = useTheme();
  const r = resumirSeguimiento(alumnos);
  return (
    <Tarjeta titulo="Resumen">
      <View style={styles.quesito}>
        <Quesito porcentaje={r.mediaPorcentaje} etiqueta="Progreso medio de horas" />
        <View style={styles.flex}>
          <ThemedText type="title">{r.mediaPorcentaje}%</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            de las horas hechas, de media entre {r.alumnos} {r.alumnos === 1 ? 'alumno' : 'alumnos'}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.cifras, styles.separado, { borderTopColor: theme.border }]}>
        <Cifra
          etiqueta="Falta valorar la empresa"
          valor={r.pendientesEmpresa}
          color={r.pendientesEmpresa ? 'estadoPendiente' : undefined}
        />
        <Cifra etiqueta="Con valoración final" valor={r.conFinal} />
      </View>
      {alumnos.length > 1 ? (
        <View style={[styles.separado, styles.grafico, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold">Progreso por alumno</ThemedText>
          <GraficoBarras
            titulo="Porcentaje de horas hechas por alumno, del más atrasado al más avanzado"
            barras={barrasProgreso(alumnos)}
            alto={110}
          />
          <Leyenda
            elementos={[
              { texto: 'En curso', color: 'primary' },
              { texto: 'Falta valoración de empresa', color: 'estadoPendiente' },
              { texto: 'Con valoración final', color: 'estadoValidado' },
            ]}
          />
        </View>
      ) : null}
    </Tarjeta>
  );
}

/** Como las cifras del Inicio del alumno: etiqueta pequeña arriba y el número debajo. */
function Cifra({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: number;
  color?: 'estadoPendiente';
}) {
  return (
    <View style={styles.cifra} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText type="subtitle" themeColor={color ?? 'text'}>
        {valor}
      </ThemedText>
    </View>
  );
}

/** Dos columnas en la web ancha (los alumnos, más ancha); en el móvil, todo seguido. */
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

/**
 * Una línea por alumno (quesito pequeño, nombre, empresa y horas). Al tocarla se despliega su
 * detalle: valoraciones de la empresa, valoración final y tareas.
 */
function FilaAlumno({
  dossier,
  datos,
  primera,
  onCambio,
}: {
  dossier: Dossier;
  datos: DatosAlumno;
  primera: boolean;
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verTareas, setVerTareas] = useState(false);
  const [verFinal, setVerFinal] = useState(false);
  const gestiona = gestionaDossier(usuario, dossier);
  const { resumen, seguimiento } = datos;

  async function guardar() {
    if (!resultado) {
      setAviso({ tipo: 'error', texto: 'Elige apto o no apto' });
      return;
    }
    setAviso(null);
    setGuardando(true);
    try {
      await ponerValoracionFinal(container.valoraciones, usuario, dossier, {
        dossierId: dossier.id,
        resultado,
        comentario,
      });
      setAviso({ tipo: 'ok', texto: 'Valoración final guardada' });
      onCambio();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[styles.alumno, !primera && { borderTopWidth: 1, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${dossier.alumnoNombre}, ${resumen.porcentaje}% de las horas. ${abierto ? 'Plegar' : 'Ver detalle'}`}
        onPress={() => setAbierto((v) => !v)}
        style={({ pressed }) => [styles.fila, pressed && { opacity: 0.6 }]}>
        <Quesito
          porcentaje={resumen.porcentaje}
          tamano={44}
          etiqueta={`Horas de ${dossier.alumnoNombre}`}
        />
        <View style={styles.flex}>
          <ThemedText type="smallBold">{dossier.alumnoNombre}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {dossier.ciclo} · {dossier.empresa ?? 'Sin empresa'}
          </ThemedText>
        </View>
        <View style={styles.derecha}>
          <ThemedText type="smallBold">{resumen.porcentaje}%</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatoHoras(resumen.realizadas)} de {formatoHoras(resumen.totales)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {abierto ? '⌃' : '⌄'}
        </ThemedText>
      </Pressable>
      {seguimiento.final ? (
        <Chip
          texto={`Final: ${TEXTO_RESULTADO[seguimiento.final.resultado]}`}
          color={seguimiento.final.resultado === 'apto' ? 'estadoValidado' : 'danger'}
        />
      ) : seguimiento.sinValorar.length > 0 ? (
        <Chip
          texto={`La empresa no ha valorado: ${seguimiento.sinValorar.map(nombreMes).join(', ')}`}
          color="estadoPendiente"
        />
      ) : null}

      {abierto ? (
        <View style={styles.detalle}>
          <View style={styles.cabeceraDetalle}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              Tutor de empresa: {dossier.tutorEmpresaNombre ?? 'sin asignar'} · del{' '}
              {fechaCorta(dossier.fechaInicio)} al {fechaCorta(dossier.fechaFin)}
            </ThemedText>
            <Enlace
              texto="Ficha ›"
              onPress={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
            />
          </View>
          <ListaValoraciones mensuales={seguimiento.mensuales} final={seguimiento.final} />
          <View style={styles.botones}>
            {gestiona ? (
              <Boton
                texto={
                  verFinal
                    ? 'Cerrar valoración final'
                    : seguimiento.final
                      ? 'Cambiar valoración final'
                      : 'Valoración final'
                }
                variante="secundario"
                onPress={() => setVerFinal((v) => !v)}
              />
            ) : null}
            <Boton
              texto={verTareas ? 'Ocultar tareas y fechas' : 'Tareas y fechas'}
              variante="secundario"
              onPress={() => setVerTareas((v) => !v)}
            />
          </View>
          {verFinal && gestiona ? (
            <>
              <Selector
                etiqueta={seguimiento.final ? 'Cambiar valoración final' : 'Valoración final'}
                opciones={RESULTADOS_FINALES.map((r) => ({ valor: r, texto: TEXTO_RESULTADO[r] }))}
                valor={resultado}
                onCambio={setResultado}
              />
              <Campo
                etiqueta="Comentario"
                multiline
                value={comentario}
                onChangeText={setComentario}
                ayuda="Obligatorio si no es apto. Cierra todos los meses del alumno."
              />
              {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
              <Boton texto="Guardar valoración final" onPress={guardar} cargando={guardando} />
            </>
          ) : aviso ? (
            <Mensaje tipo={aviso.tipo} texto={aviso.texto} />
          ) : null}
          {verTareas ? (
            <>
              <TareasDossier dossier={dossier} />
              {gestiona ? <NuevoEvento dossier={dossier} /> : null}
            </>
          ) : null}
        </View>
      ) : null}
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

const styles = StyleSheet.create({
  acciones: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  accionesMovil: { gap: Spacing.two },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  quesito: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  flex: { flex: 1, gap: Spacing.one },
  separado: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three },
  cifras: { flexDirection: 'row', gap: Spacing.three },
  cifra: { flex: 1, gap: Spacing.half },
  grafico: { gap: Spacing.two },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  alumno: { gap: Spacing.two, paddingVertical: Spacing.two },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  filaAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  seccion: { gap: Spacing.two, paddingTop: Spacing.three },
  seccionCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  derecha: { alignItems: 'flex-end', gap: Spacing.half },
  detalle: { gap: Spacing.three, paddingTop: Spacing.one },
  cabeceraDetalle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
