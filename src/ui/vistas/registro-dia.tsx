import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import {
  eliminarRegistro,
  guardarRegistro,
  listarRegistros,
} from '@/core/application/registro-diario';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { estaEnPeriodo } from '@/core/domain/dossier';
import type { ActividadFormativa } from '@/core/domain/dossier';
import { MAX_HORAS_DIA, type RegistroDiario, type TipoDia } from '@/core/domain/registro-diario';
import { mesCerrado, mesDe } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, limitesMes, sumarDias } from '@/ui/utils/fechas';
import { pasoHoras } from '@/ui/utils/horas';

import { CalendarioMes, ESTADOS_DIA } from './calendario-mes';
import { Cargando } from './comun';

const TIPOS: { valor: TipoDia; texto: string }[] = [
  { valor: 'trabajo', texto: 'Trabajo' },
  { valor: 'ausencia', texto: 'Ausencia' },
  { valor: 'festivo', texto: 'Festivo' },
];

/** El alumno apunta lo que ha hecho un día y las horas por actividad. */
export function VistaRegistroDia({ fechaInicial }: { fechaInicial?: string }) {
  const theme = useTheme();
  const usuario = useUsuario();
  const ancha = useWebAncha();
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO());
  const [verCalendario, setVerCalendario] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [desde, hasta] = limitesMes(fecha);
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await obtenerDossierActual(container.dossiers, hoyISO());
    if (!dossier) return null;
    const [dias, seguimiento] = await Promise.all([
      listarRegistros(container.registros, dossier.id, desde, hasta),
      obtenerSeguimiento(container.valoraciones, dossier, hoyISO()),
    ]);
    return { dossier, dias, seguimiento };
  }, [desde, hasta]);
  useRecargarAlVolver(recargar);

  const existente = datos?.dias.find((d) => d.fecha === fecha) ?? null;
  const cerrado = datos
    ? mesCerrado(fecha, datos.seguimiento.mensuales, datos.seguimiento.final)
    : false;
  const fueraDePeriodo = datos ? !estaEnPeriodo(datos.dossier, fecha) : false;

  if (!datos) {
    return (
      <Pantalla titulo="Registrar día" compacta>
        {error ? (
          <>
            <Mensaje tipo="error" texto={error} />
            <Boton texto="Reintentar" onPress={recargar} />
          </>
        ) : cargando ? (
          <Cargando />
        ) : (
          <ThemedText themeColor="textSecondary">
            No tienes un dossier de prácticas asignado.
          </ThemedText>
        )}
      </Pantalla>
    );
  }
  const { dossier } = datos;

  function irA(nueva: string) {
    Keyboard.dismiss();
    setAviso(null);
    setFecha(nueva);
  }

  async function guardar({ tipo, horas, observaciones }: ValoresDia) {
    Keyboard.dismiss();
    setAviso(null);
    setGuardando(true);
    try {
      await guardarRegistro(container.registros, container.valoraciones, usuario, dossier, {
        dossierId: dossier.id,
        fecha,
        tipo,
        horas: tipo === 'trabajo' ? horas : [],
        observaciones,
      });
      setAviso({ tipo: 'ok', texto: `Guardado el ${fechaCorta(fecha)}` });
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!existente) return;
    Keyboard.dismiss();
    setAviso(null);
    try {
      await eliminarRegistro(
        container.registros,
        container.valoraciones,
        usuario,
        dossier,
        existente,
      );
      setAviso({ tipo: 'ok', texto: 'Día borrado' });
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    }
  }

  const bloqueado = cerrado || fueraDePeriodo || cargando || error !== null;
  const hoy = hoyISO();
  // El último día de trabajo apuntado antes de este (del mes cargado), para copiar sus horas.
  const ultimoTrabajo =
    datos.dias
      .filter((d) => d.tipo === 'trabajo' && d.fecha < fecha)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;

  // El chip usa los mismos colores que las celdas del calendario.
  const estado: { texto: string; estado: EstadoChip } = fueraDePeriodo
    ? { texto: 'Fuera del periodo', estado: 'festivo' }
    : cerrado
      ? { texto: 'Mes valorado: solo lectura', estado: 'festivo' }
      : existente
        ? { texto: ESTADOS_DIA[existente.tipo].texto, estado: existente.tipo }
        : { texto: ESTADOS_DIA.pendiente.texto, estado: 'pendiente' };

  const calendario = (
    <CalendarioMes
      mes={mesDe(fecha)}
      // Al cambiar de mes se elige su primer día (o hoy, si es el mes actual).
      onCambiarMes={(m) => irA(m === mesDe(hoy) ? hoy : `${m}-01`)}
      dias={datos.dias}
      periodo={dossier}
      hoy={hoy}
      cerrado={cerrado}
      seleccionada={fecha}
      onElegir={(f) => {
        irA(f);
        setVerCalendario(false);
      }}
    />
  );

  const navegacion = (
    <Tarjeta>
      <View style={styles.navFecha}>
        <View style={styles.centro}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.diaSemana}>
            {diaSemana(fecha)}
          </ThemedText>
          <ThemedText type="subtitle" accessibilityRole="header">
            {fechaCorta(fecha)}
          </ThemedText>
        </View>
        {/* Las flechas van juntas, como un único control de paso. */}
        <View style={[styles.flechas, { borderColor: theme.border }]}>
          <BotonFlecha
            texto="‹"
            etiqueta="Día anterior"
            onPress={() => irA(sumarDias(fecha, -1))}
          />
          <View style={[styles.separadorFlechas, { backgroundColor: theme.border }]} />
          <BotonFlecha
            texto="›"
            etiqueta="Día siguiente"
            onPress={() => irA(sumarDias(fecha, 1))}
          />
        </View>
      </View>
      <View style={styles.enlaces}>
        <ChipEstado texto={estado.texto} estado={estado.estado} />
        <View style={styles.hueco} />
        {fecha !== hoy ? <BotonHoy onPress={() => irA(hoy)} /> : null}
        {/* En la web ancha el calendario va siempre a la vista en su columna. */}
        {!ancha ? (
          <Enlace
            texto={verCalendario ? 'Ocultar calendario' : 'Ver calendario'}
            onPress={() => {
              Keyboard.dismiss();
              setVerCalendario((v) => !v);
            }}
          />
        ) : null}
      </View>
      {/* Arriba y plegable: al elegir un día se cierra y el formulario queda a la vista. */}
      {verCalendario && !ancha ? calendario : null}
    </Tarjeta>
  );

  const formulario = (
    <FormularioDia
      // Al cambiar de día (o tras guardar) el formulario empieza con lo ya apuntado.
      key={`${fecha}-${JSON.stringify(existente)}`}
      actividades={dossier.actividades}
      existente={existente}
      ultimoTrabajo={existente ? null : ultimoTrabajo}
      bloqueado={bloqueado}
      motivoBloqueo={
        fueraDePeriodo
          ? 'Este día está fuera de tu periodo de prácticas.'
          : cerrado
            ? 'La empresa ya ha valorado este mes: no se puede cambiar.'
            : null
      }
      guardando={guardando}
      aviso={aviso}
      onGuardar={guardar}
      onBorrar={borrar}
    />
  );

  return (
    // En iOS el teclado tapa el final del formulario si no se aparta el contenido.
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla
        titulo="Registrar día"
        subtitulo={`${dossier.ciclo} · ${dossier.empresa ?? ''}`}
        amplia={ancha}
        compacta>
        {ancha ? (
          <View style={styles.columnas}>
            <View style={styles.izquierda}>
              {navegacion}
              <Tarjeta>{calendario}</Tarjeta>
            </View>
            <View style={styles.derecha}>{formulario}</View>
          </View>
        ) : (
          <>
            {navegacion}
            {formulario}
          </>
        )}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

/** Botón cuadrado de 44 px para las flechas de día. */
function BotonIcono({
  texto,
  etiqueta,
  onPress,
  desactivado,
  onLongPress,
}: {
  texto: string;
  etiqueta: string;
  onPress: () => void;
  desactivado?: boolean;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !!desactivado }}
      disabled={desactivado}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.icono,
        { borderColor: theme.border, backgroundColor: theme.surface },
        (pressed || desactivado) && { opacity: 0.4 },
      ]}>
      <ThemedText type="subtitle" style={styles.textoIcono}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Flecha sutil de 44 px, sin borde propio: el grupo pone el marco. */
function BotonFlecha({
  texto,
  etiqueta,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [styles.flecha, pressed && { backgroundColor: theme.subtle }]}>
      <ThemedText type="subtitle" themeColor="textSecondary" style={styles.textoIcono}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Píldora pequeña para volver a hoy. */
function BotonHoy({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ir a hoy"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.hoy,
        { borderColor: theme.primary, backgroundColor: theme.primarySuave },
        pressed && { opacity: 0.6 },
      ]}>
      <ThemedText type="smallBold" themeColor="primary">
        Hoy
      </ThemedText>
    </Pressable>
  );
}

type EstadoChip = 'trabajo' | 'ausencia' | 'festivo' | 'pendiente';

/** Chip de estado con el relleno y la tinta de las celdas del calendario. */
function ChipEstado({ texto, estado }: { texto: string; estado: EstadoChip }) {
  const theme = useTheme();
  const { fondo, tinta } = ESTADOS_DIA[estado];
  const pendiente = estado === 'pendiente';
  return (
    <View
      accessible
      accessibilityLabel={`Estado: ${texto}`}
      style={[
        styles.chip,
        {
          backgroundColor: theme[fondo ?? 'subtle'],
          borderColor: pendiente ? theme.bordePendiente : 'transparent',
          borderStyle: pendiente ? 'dashed' : 'solid',
        },
      ]}>
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={[styles.textoChip, { color: theme[tinta ?? 'text'] }]}>
        {texto}
      </ThemedText>
    </View>
  );
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** `2026-10-22` → `jueves` */
function diaSemana(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.enlace}>
      <ThemedText type="smallBold" themeColor="primary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  columnas: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  izquierda: { flex: 5, gap: Spacing.three },
  derecha: { flex: 6, gap: Spacing.three },
  navFecha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  centro: { flex: 1, gap: 2 },
  diaSemana: { textTransform: 'capitalize' },
  flechas: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.button,
    overflow: 'hidden',
  },
  flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  separadorFlechas: { width: 1, height: 24 },
  enlaces: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hueco: { flex: 1 },
  chip: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
  },
  textoChip: { fontSize: 13 },
  hoy: {
    minHeight: 32,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enlace: { minHeight: 32, justifyContent: 'center' },
  icono: {
    width: 44,
    height: 44,
    borderRadius: Radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoIcono: { lineHeight: 28 },
  tipos: { flexDirection: 'row', gap: Spacing.two },
  tipo: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filaTexto: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  valor: { minWidth: 56, textAlign: 'center' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalNumero: { fontSize: 28, lineHeight: 34 },
  botones: { gap: Spacing.two },
  separador: { height: StyleSheet.hairlineWidth },
  punto: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
});

interface ValoresDia {
  tipo: TipoDia;
  horas: { actividadId: string; horas: number }[];
  observaciones: string;
}

/** Jornada de referencia para la barra del total: no es un límite, solo da escala. */
const JORNADA = 8;

interface PropsFormulario {
  actividades: ActividadFormativa[];
  existente: RegistroDiario | null;
  /** Día del que se pueden copiar las horas (solo si este aún no está apuntado). */
  ultimoTrabajo: RegistroDiario | null;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  guardando: boolean;
  aviso: { tipo: 'error' | 'ok'; texto: string } | null;
  onGuardar: (valores: ValoresDia) => void;
  onBorrar: () => void;
}

function FormularioDia({
  actividades,
  existente,
  ultimoTrabajo,
  bloqueado,
  motivoBloqueo,
  guardando,
  aviso,
  onGuardar,
  onBorrar,
}: PropsFormulario) {
  const theme = useTheme();
  const [tipo, setTipo] = useState<TipoDia>(existente?.tipo ?? 'trabajo');
  const [horas, setHoras] = useState<Record<string, number>>(() =>
    Object.fromEntries((existente?.horas ?? []).map((h) => [h.actividadId, h.horas])),
  );
  const [observaciones, setObservaciones] = useState(existente?.observaciones ?? '');

  const total = actividades.reduce((s, a) => s + (horas[a.id] ?? 0), 0);
  const sinHoras = tipo === 'trabajo' && total === 0;
  const pasado = total > MAX_HORAS_DIA;
  const puedeGuardar = !bloqueado && (tipo !== 'trabajo' || (!sinHoras && !pasado));
  // Por qué no se puede guardar, dicho junto al botón.
  const motivo = bloqueado
    ? motivoBloqueo
    : sinHoras
      ? 'Apunta las horas de al menos una actividad para guardar.'
      : pasado
        ? `Un día no puede pasar de ${MAX_HORAS_DIA} h: quita ${formatoHoras(total - MAX_HORAS_DIA)}.`
        : null;

  function cambiar(id: string, delta: number) {
    if (bloqueado) return;
    setHoras((h) => ({ ...h, [id]: pasoHoras(h[id] ?? 0, delta, MAX_HORAS_DIA) }));
  }

  function enviar() {
    onGuardar({
      tipo,
      observaciones,
      horas: actividades.flatMap((a) =>
        (horas[a.id] ?? 0) > 0 ? [{ actividadId: a.id, horas: horas[a.id] }] : [],
      ),
    });
  }

  return (
    // Tocar fuera de un campo cierra el teclado.
    <Pressable accessible={false} onPress={Keyboard.dismiss}>
      <Tarjeta titulo="Qué has hecho">
        <View style={styles.tipos} accessibilityRole="radiogroup">
          {TIPOS.map((t) => {
            const elegido = t.valor === tipo;
            const { fondo, tinta } = ESTADOS_DIA[t.valor];
            return (
              <Pressable
                key={t.valor}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido, disabled: bloqueado }}
                disabled={bloqueado}
                onPress={() => {
                  Keyboard.dismiss();
                  setTipo(t.valor);
                }}
                style={[
                  styles.tipo,
                  elegido
                    ? { borderColor: theme.primary, backgroundColor: theme.primarySuave }
                    : { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.punto,
                    {
                      backgroundColor: theme[fondo ?? 'subtle'],
                      borderColor: theme[tinta ?? 'textSecondary'],
                    },
                  ]}
                />
                <ThemedText type={elegido ? 'smallBold' : 'small'}>{t.texto}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        {tipo === 'trabajo' ? (
          <>
            <View style={styles.total}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Total del día
              </ThemedText>
              <ThemedText
                type="smallBold"
                themeColor={pasado ? 'danger' : 'text'}
                style={styles.totalNumero}>
                {formatoHoras(total)}
              </ThemedText>
            </View>
            <BarraProgreso
              porcentaje={(total / JORNADA) * 100}
              etiqueta={`Total del día, ${formatoHoras(total)} de una jornada de ${JORNADA} h`}
              color={pasado ? 'danger' : 'primary'}
            />
            <ThemedText type="small" themeColor={pasado ? 'danger' : 'textSecondary'}>
              {pasado
                ? `Máximo ${MAX_HORAS_DIA} h al día`
                : `Jornada de referencia: ${JORNADA} h · máximo ${MAX_HORAS_DIA} h`}
            </ThemedText>

            {ultimoTrabajo && !bloqueado ? (
              <Enlace
                texto={`Copiar horas del ${fechaCorta(ultimoTrabajo.fecha)}`}
                onPress={() =>
                  setHoras(
                    Object.fromEntries(ultimoTrabajo.horas.map((h) => [h.actividadId, h.horas])),
                  )
                }
              />
            ) : null}

            <View>
              {actividades.map((a, i) => {
                const valor = horas[a.id] ?? 0;
                return (
                  <View key={a.id}>
                    {i > 0 ? (
                      <View style={[styles.separadorFlechas, { backgroundColor: theme.border }]} />
                    ) : null}
                    <View style={styles.fila}>
                      <ThemedText
                        style={styles.filaTexto}
                        themeColor={valor > 0 ? 'text' : 'textSecondary'}>
                        {a.descripcion}
                      </ThemedText>
                      <View
                        style={styles.stepper}
                        accessible
                        accessibilityRole="adjustable"
                        accessibilityLabel={`${a.descripcion}, ${formatoHoras(valor)}`}
                        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                        onAccessibilityAction={(e) =>
                          cambiar(a.id, e.nativeEvent.actionName === 'increment' ? 0.5 : -0.5)
                        }>
                        <BotonIcono
                          texto="−"
                          etiqueta={`Quitar media hora a ${a.descripcion}`}
                          desactivado={bloqueado || valor === 0}
                          onPress={() => cambiar(a.id, -0.5)}
                          // Mantener pulsado ajusta de 15 en 15 min.
                          onLongPress={() => cambiar(a.id, -0.25)}
                        />
                        <ThemedText
                          type="smallBold"
                          themeColor={valor > 0 ? 'text' : 'textSecondary'}
                          style={styles.valor}>
                          {formatoHoras(valor)}
                        </ThemedText>
                        <BotonIcono
                          texto="+"
                          etiqueta={`Añadir media hora a ${a.descripcion}`}
                          desactivado={bloqueado || total >= MAX_HORAS_DIA}
                          onPress={() => cambiar(a.id, 0.5)}
                          onLongPress={() => cambiar(a.id, 0.25)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Cada toque suma o resta media hora; mantén pulsado para ajustar 15 min.
            </ThemedText>
          </>
        ) : null}

        <Campo
          etiqueta={tipo === 'trabajo' ? 'Observaciones' : 'Nota'}
          multiline
          editable={!bloqueado}
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder={
            tipo === 'ausencia'
              ? 'Opcional: motivo (médico, examen…)'
              : tipo === 'festivo'
                ? 'Opcional: qué festivo es'
                : 'Opcional'
          }
        />
        {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
        <View style={styles.botones}>
          {motivo ? (
            <ThemedText type="small" themeColor={pasado ? 'danger' : 'textSecondary'}>
              {motivo}
            </ThemedText>
          ) : null}
          <Boton
            texto={existente ? 'Guardar cambios' : 'Guardar día'}
            onPress={enviar}
            cargando={guardando}
            desactivado={!puedeGuardar}
          />
          {existente && !bloqueado ? (
            <Boton texto="Borrar día" variante="peligro" onPress={onBorrar} />
          ) : null}
        </View>
      </Tarjeta>
    </Pressable>
  );
}
