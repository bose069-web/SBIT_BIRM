import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers, obtenerResumenHoras, puedeCrearDossier } from '@/core/application/dossier';
import {
  obtenerSeguimiento,
  ponerValoracionFinal,
  type Seguimiento,
} from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
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
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';
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
  instituto: 'Todos los alumnos de tu centro',
  generalitat: 'Todos los institutos',
};

/**
 * Seguimiento de varios dossiers. La base de datos decide cuáles ve cada uno: el profe, los de
 * sus alumnos; el instituto, los de su centro; la generalitat, todos.
 */
interface DatosAlumno {
  resumen: ResumenHoras;
  seguimiento: Seguimiento;
}

export function SeguimientoProfe() {
  const usuario = useUsuario();
  const creaDossiers = !!usuario.centroId && puedeCrearDossier(usuario, usuario.centroId);
  const ancho = useWebAncha();
  const acciones = creaDossiers ? (
    <View style={ancho ? styles.acciones : styles.accionesMovil}>
      <Boton
        texto="+ Nuevo dossier"
        onPress={() => router.push({ pathname: '/', params: { nuevo: '1' } })}
      />
    </View>
  ) : null;
  return (
    <Pantalla
      titulo="Seguimiento"
      subtitulo={SUBTITULO[usuario.rol]}
      // En la web, las acciones junto al título, como el estado del mes en el Inicio del alumno.
      accion={ancho ? acciones : undefined}
      amplia={ancho}>
      {ancho ? null : acciones}
      <ContenidoSeguimiento />
    </Pantalla>
  );
}

/**
 * La lista de alumnos con su resumen. La generalitat ve todos los dossiers, así que `centroId`
 * limita al instituto que está gestionando.
 */
export function ContenidoSeguimiento({
  centroId = null,
  onFicha = (id) => router.push({ pathname: '/', params: { dossier: id } }),
}: {
  centroId?: string | null;
  onFicha?: (dossierId: string) => void;
}) {
  const hoy = hoyISO();
  // Se cargan aquí las horas y valoraciones de todos para poder hacer el resumen del lateral.
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const todos = porAlumno(await listarDossiers(container.dossiers));
    const dossiers = centroId ? todos.filter((d) => d.centroId === centroId) : todos;
    const detalles = await Promise.all(
      dossiers.map(async (dossier) => {
        const [resumen, seguimiento] = await Promise.all([
          obtenerResumenHoras(dossier, container.registros),
          obtenerSeguimiento(container.valoraciones, dossier, hoy),
        ]);
        return { dossier, datos: { resumen, seguimiento } };
      }),
    );
    return detalles;
  }, [hoy, centroId]);
  useRecargarAlVolver(recargar);
  // En la web horizontal, alumnos a la izquierda y resumen a la derecha; en el móvil, seguido.
  const ancho = useWebAncha();

  const alumnos: AlumnoSeguido[] = (datos ?? []).map(({ dossier, datos: d }) => ({
    nombre: dossier.alumnoNombre,
    porcentaje: d.resumen.porcentaje,
    mesesSinValorar: d.seguimiento.sinValorar.length,
    tieneFinal: !!d.seguimiento.final,
  }));

  // Del que va más atrasado al más avanzado: lo primero que ve el profe es a quién atender.
  const ordenados = [...(datos ?? [])].sort(
    (a, b) => a.datos.resumen.porcentaje - b.datos.resumen.porcentaje,
  );

  return (
    <>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel /> : null}
      {datos?.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay alumnos con dossier"
          texto="Cuando tus alumnos tengan su dossier de prácticas, aquí verás sus horas, las valoraciones de la empresa y podrás poner la valoración final."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos && datos.length > 0 ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <Tarjeta titulo={`Alumnos (${datos.length})`}>
              <View>
                {ordenados.map(({ dossier, datos: d }, i) => (
                  <FilaAlumno
                    key={dossier.id}
                    primera={i === 0}
                    dossier={dossier}
                    datos={d}
                    onCambio={recargar}
                    onFicha={() => onFicha(dossier.id)}
                  />
                ))}
              </View>
            </Tarjeta>
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
    </>
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
  onFicha,
}: {
  dossier: Dossier;
  datos: DatosAlumno;
  primera: boolean;
  onCambio: () => void;
  onFicha: () => void;
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
            <Enlace texto="Ficha ›" onPress={onFicha} />
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
  derecha: { alignItems: 'flex-end', gap: Spacing.half },
  detalle: { gap: Spacing.three, paddingTop: Spacing.one },
  cabeceraDetalle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
