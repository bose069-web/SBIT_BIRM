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
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, limitesMes, sumarDias } from '@/ui/utils/fechas';
import { filtrarHoras, leerHoras } from '@/ui/utils/horas';

import { CalendarioMes } from './calendario-mes';
import { Cargando } from './comun';

const TIPOS: { valor: TipoDia; texto: string }[] = [
  { valor: 'trabajo', texto: 'Trabajo' },
  { valor: 'ausencia', texto: 'Ausencia' },
  { valor: 'festivo', texto: 'Festivo' },
];

/** El alumno apunta lo que ha hecho un día y las horas por actividad. */
export function VistaRegistroDia({ fechaInicial }: { fechaInicial?: string }) {
  const usuario = useUsuario();
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
      <Pantalla titulo="Registrar día">
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

  return (
    // En iOS el teclado tapa el final del formulario si no se aparta el contenido.
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla titulo="Registrar día" subtitulo={`${dossier.ciclo} · ${dossier.empresa ?? ''}`}>
        <Tarjeta>
          <View style={styles.navFecha}>
            <Boton texto="‹" variante="secundario" onPress={() => irA(sumarDias(fecha, -1))} />
            <View style={styles.centro}>
              <ThemedText type="subtitle">{fechaCorta(fecha)}</ThemedText>
              {fueraDePeriodo ? (
                <Chip texto="Fuera del periodo de prácticas" color="estadoFestivo" />
              ) : cerrado ? (
                <Chip texto="Mes valorado: no se puede cambiar" color="estadoFestivo" />
              ) : existente ? (
                <Chip texto="Apuntado" color="estadoValidado" />
              ) : (
                <Chip texto="Sin apuntar" color="estadoPendiente" />
              )}
            </View>
            <Boton texto="›" variante="secundario" onPress={() => irA(sumarDias(fecha, 1))} />
          </View>
          <View style={styles.acciones}>
            <View style={styles.flex}>
              <Boton
                texto={verCalendario ? 'Ocultar calendario' : 'Calendario'}
                variante="secundario"
                onPress={() => {
                  Keyboard.dismiss();
                  setVerCalendario((v) => !v);
                }}
              />
            </View>
            {fecha !== hoyISO() ? (
              <View style={styles.flex}>
                <Boton texto="Hoy" variante="secundario" onPress={() => irA(hoyISO())} />
              </View>
            ) : null}
          </View>
          {/* Arriba y plegable: al elegir un día se cierra y el formulario queda a la vista. */}
          {verCalendario ? (
            <CalendarioMes
              mes={mesDe(fecha)}
              // Al cambiar de mes se elige su primer día (o hoy, si es el mes actual).
              onCambiarMes={(m) => irA(m === mesDe(hoyISO()) ? hoyISO() : `${m}-01`)}
              dias={datos.dias}
              periodo={dossier}
              hoy={hoyISO()}
              cerrado={cerrado}
              seleccionada={fecha}
              onElegir={(f) => {
                irA(f);
                setVerCalendario(false);
              }}
            />
          ) : null}
        </Tarjeta>

        <FormularioDia
          // Al cambiar de día (o tras guardar) el formulario empieza con lo ya apuntado.
          key={`${fecha}-${JSON.stringify(existente)}`}
          actividades={dossier.actividades}
          existente={existente}
          bloqueado={bloqueado}
          guardando={guardando}
          aviso={aviso}
          onGuardar={guardar}
          onBorrar={borrar}
        />
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navFecha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  centro: { flex: 1, alignItems: 'center', gap: Spacing.one },
  acciones: { flexDirection: 'row', gap: Spacing.two },
  botones: { gap: Spacing.two },
  campo: { gap: Spacing.one },
  total: { flexDirection: 'row', justifyContent: 'space-between' },
});

interface ValoresDia {
  tipo: TipoDia;
  horas: { actividadId: string; horas: number }[];
  observaciones: string;
}

interface PropsFormulario {
  actividades: ActividadFormativa[];
  existente: RegistroDiario | null;
  bloqueado: boolean;
  guardando: boolean;
  aviso: { tipo: 'error' | 'ok'; texto: string } | null;
  onGuardar: (valores: ValoresDia) => void;
  onBorrar: () => void;
}

function FormularioDia({
  actividades,
  existente,
  bloqueado,
  guardando,
  aviso,
  onGuardar,
  onBorrar,
}: PropsFormulario) {
  const [tipo, setTipo] = useState<TipoDia>(existente?.tipo ?? 'trabajo');
  const [horas, setHoras] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (existente?.horas ?? []).map((h) => [h.actividadId, String(h.horas).replace('.', ',')]),
    ),
  );
  const [observaciones, setObservaciones] = useState(existente?.observaciones ?? '');

  // Se comprueba mientras se escribe, sin esperar a pulsar Guardar.
  const leidas = actividades.map((a) => ({ id: a.id, lectura: leerHoras(horas[a.id] ?? '') }));
  const total = leidas.reduce(
    (s, { lectura }) => s + (lectura.tipo === 'ok' ? lectura.horas : 0),
    0,
  );
  const hayErrores = leidas.some(({ lectura }) => lectura.tipo === 'error');
  const sinHoras = tipo === 'trabajo' && total === 0;
  const pasado = total > MAX_HORAS_DIA;
  const puedeGuardar = !bloqueado && (tipo !== 'trabajo' || (!hayErrores && !sinHoras && !pasado));

  function enviar() {
    onGuardar({
      tipo,
      observaciones,
      horas: leidas.flatMap(({ id, lectura }) =>
        lectura.tipo === 'ok' ? [{ actividadId: id, horas: lectura.horas }] : [],
      ),
    });
  }

  return (
    // Tocar fuera de un campo cierra el teclado (el numérico de iOS no tiene botón para cerrarlo).
    <Pressable accessible={false} onPress={Keyboard.dismiss}>
      <Tarjeta titulo="Qué has hecho">
        <Selector
          opciones={TIPOS}
          valor={tipo}
          onCambio={(t) => {
            Keyboard.dismiss();
            if (!bloqueado) setTipo(t);
          }}
        />
        {tipo === 'trabajo' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Horas por actividad, en tramos de 15 min (p. ej. 1,5). Deja en blanco las que no hayas
              hecho.
            </ThemedText>
            {actividades.map((a, i) => {
              const lectura = leidas[i].lectura;
              return (
                <View key={a.id} style={styles.campo}>
                  <Campo
                    etiqueta={a.descripcion}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    editable={!bloqueado}
                    value={horas[a.id] ?? ''}
                    onChangeText={(v) => setHoras((h) => ({ ...h, [a.id]: filtrarHoras(v) }))}
                  />
                  {lectura.tipo === 'error' ? (
                    <ThemedText type="small" themeColor="danger">
                      {lectura.motivo}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
        <Campo
          etiqueta="Observaciones"
          multiline
          editable={!bloqueado}
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder="Opcional"
        />
        {tipo === 'trabajo' ? (
          <View style={styles.total}>
            <ThemedText type="smallBold">Total del día</ThemedText>
            <ThemedText type="smallBold" themeColor={pasado ? 'danger' : 'text'}>
              {formatoHoras(total)}
              {pasado ? ` · máximo ${MAX_HORAS_DIA} h` : ''}
            </ThemedText>
          </View>
        ) : null}
        {sinHoras && !bloqueado ? (
          <ThemedText type="small" themeColor="textSecondary">
            Apunta las horas de al menos una actividad para guardar.
          </ThemedText>
        ) : null}
        {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
        <View style={styles.botones}>
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
