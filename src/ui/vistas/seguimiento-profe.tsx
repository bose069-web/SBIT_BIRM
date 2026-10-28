import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

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
  CabeceraAlumno,
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
  const { rol } = usuario;
  const hoy = hoyISO();
  const creaDossiers = !!usuario.centroId && puedeCrearDossier(usuario, usuario.centroId);
  const administra = rol === 'instituto' || rol === 'generalitat';
  // Se cargan aquí las horas y valoraciones de todos para poder hacer el resumen del lateral.
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossiers = porAlumno(await listarDossiers(container.dossiers));
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
  }, [hoy]);
  useRecargarAlVolver(recargar);
  const { width } = useWindowDimensions();
  // En la web horizontal, alumnos a la izquierda y resumen a la derecha; en el móvil, seguido.
  const ancho = Platform.OS === 'web' && width >= 1000;

  const alumnos: AlumnoSeguido[] = (datos ?? []).map(({ dossier, datos: d }) => ({
    nombre: dossier.alumnoNombre,
    porcentaje: d.resumen.porcentaje,
    mesesSinValorar: d.seguimiento.sinValorar.length,
    tieneFinal: !!d.seguimiento.final,
  }));

  return (
    <Pantalla titulo="Seguimiento" subtitulo={SUBTITULO[rol]} amplia={ancho}>
      {administra || creaDossiers ? (
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
      ) : null}
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
          izquierda={datos.map(({ dossier, datos: d }) => (
            <SeguimientoDossier key={dossier.id} dossier={dossier} datos={d} onCambio={recargar} />
          ))}
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

/** Resumen de todos los alumnos: progreso medio, quién va atrasado y qué falta por valorar. */
function ResumenAlumnos({ alumnos }: { alumnos: AlumnoSeguido[] }) {
  const theme = useTheme();
  const r = resumirSeguimiento(alumnos);
  return (
    <Tarjeta titulo="Tus alumnos">
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
          valor={r.pendientesEmpresa}
          texto="con meses sin valorar"
          color={r.pendientesEmpresa ? 'estadoPendiente' : 'textSecondary'}
        />
        <Cifra valor={r.conFinal} texto="con valoración final" color="estadoValidado" />
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

function Cifra({
  valor,
  texto,
  color,
}: {
  valor: number;
  texto: string;
  color: 'estadoPendiente' | 'estadoValidado' | 'textSecondary';
}) {
  return (
    <View style={styles.cifra} accessible accessibilityLabel={`${valor} ${texto}`}>
      <ThemedText type="subtitle" themeColor={color}>
        {valor}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
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

function SeguimientoDossier({
  dossier,
  datos,
  onCambio,
}: {
  dossier: Dossier;
  datos: DatosAlumno;
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verTareas, setVerTareas] = useState(false);
  const [verFinal, setVerFinal] = useState(false);

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
    <Tarjeta>
      <CabeceraAlumno
        onAbrir={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
        nombre={dossier.alumnoNombre}
        detalle={[
          `${dossier.ciclo} · ${dossier.empresa ?? 'Sin empresa'}`,
          `Tutor de empresa: ${dossier.tutorEmpresaNombre ?? 'sin asignar'}`,
          `Del ${fechaCorta(dossier.fechaInicio)} al ${fechaCorta(dossier.fechaFin)}`,
        ]}
      />
      <View style={[styles.quesito, styles.separado, { borderTopColor: theme.border }]}>
        <Quesito
          porcentaje={datos.resumen.porcentaje}
          tamano={72}
          etiqueta={`Horas de ${dossier.alumnoNombre}`}
        />
        <View style={styles.flex}>
          <ThemedText type="smallBold">
            {formatoHoras(datos.resumen.realizadas)} de {formatoHoras(datos.resumen.totales)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {datos.resumen.porcentaje}% completado
          </ThemedText>
        </View>
      </View>
      {datos.seguimiento.sinValorar.length > 0 ? (
        <Chip
          texto={`La empresa no ha valorado: ${datos.seguimiento.sinValorar.map(nombreMes).join(', ')}`}
          color="estadoPendiente"
        />
      ) : null}
      <ListaValoraciones mensuales={datos.seguimiento.mensuales} final={datos.seguimiento.final} />

      {/* Valoración final y tareas plegadas para que la lista de alumnos no sea eterna. */}
      <View style={styles.botones}>
        {gestionaDossier(usuario, dossier) ? (
          <Boton
            texto={
              verFinal
                ? 'Cerrar valoración final'
                : datos.seguimiento.final
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
      {verFinal && gestionaDossier(usuario, dossier) ? (
        <>
          <Selector
            etiqueta={datos.seguimiento.final ? 'Cambiar valoración final' : 'Valoración final'}
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
          {gestionaDossier(usuario, dossier) ? <NuevoEvento dossier={dossier} /> : null}
        </>
      ) : null}
    </Tarjeta>
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
});
