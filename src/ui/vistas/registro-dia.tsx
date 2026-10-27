import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import {
  eliminarRegistro,
  guardarRegistro,
  listarRegistros,
} from '@/core/application/registro-diario';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { estaEnPeriodo } from '@/core/domain/dossier';
import type { ActividadFormativa } from '@/core/domain/dossier';
import { totalHoras, type RegistroDiario, type TipoDia } from '@/core/domain/registro-diario';
import { mesCerrado } from '@/core/domain/valoracion';
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
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import {
  fechaCorta,
  formatoHoras,
  hoyISO,
  limitesMes,
  nombreMes,
  sumarDias,
} from '@/ui/utils/fechas';

import { Cargando, estilosComunes } from './comun';

const TIPOS: { valor: TipoDia; texto: string }[] = [
  { valor: 'trabajo', texto: 'Trabajo' },
  { valor: 'ausencia', texto: 'Ausencia' },
  { valor: 'festivo', texto: 'Festivo' },
];

/** El alumno apunta lo que ha hecho un día y las horas por actividad. */
export function VistaRegistroDia() {
  const usuario = useUsuario();
  const theme = useTheme();
  const [fecha, setFecha] = useState(hoyISO());
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

  const existente = datos?.dias.find((d) => d.fecha === fecha) ?? null;
  const cerrado = datos
    ? mesCerrado(fecha, datos.seguimiento.mensuales, datos.seguimiento.final)
    : false;
  const fueraDePeriodo = datos ? !estaEnPeriodo(datos.dossier, fecha) : false;

  if (!datos) {
    return (
      <Pantalla titulo="Registrar día">
        {error ? (
          <Mensaje tipo="error" texto={error} />
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

  async function guardar({ tipo, horas, observaciones }: ValoresDia) {
    setAviso(null);
    setGuardando(true);
    try {
      const lista =
        tipo === 'trabajo'
          ? Object.entries(horas)
              .filter(([, v]) => v.trim() !== '')
              .map(([actividadId, v]) => ({ actividadId, horas: Number(v.replace(',', '.')) }))
          : [];
      await guardarRegistro(container.registros, container.valoraciones, usuario, dossier, {
        dossierId: dossier.id,
        fecha,
        tipo,
        horas: lista,
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

  const bloqueado = cerrado || fueraDePeriodo;

  return (
    <Pantalla titulo="Registrar día" subtitulo={`${dossier.ciclo} · ${dossier.empresa ?? ''}`}>
      <Tarjeta>
        <View style={styles.navFecha}>
          <Boton texto="‹" variante="secundario" onPress={() => setFecha(sumarDias(fecha, -1))} />
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
          <Boton texto="›" variante="secundario" onPress={() => setFecha(sumarDias(fecha, 1))} />
        </View>
        {fecha !== hoyISO() ? (
          <Boton texto="Ir a hoy" variante="secundario" onPress={() => setFecha(hoyISO())} />
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

      <Tarjeta titulo={`Días de ${nombreMes(fecha.slice(0, 7))}`}>
        {datos.dias.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Aún no has apuntado ningún día este mes.
          </ThemedText>
        ) : (
          datos.dias.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              onPress={() => setFecha(d.fecha)}
              style={[
                styles.dia,
                { borderColor: d.fecha === fecha ? theme.primary : theme.border },
              ]}>
              <ThemedText type="smallBold">{fechaCorta(d.fecha)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {d.tipo === 'trabajo'
                  ? formatoHoras(totalHoras(d))
                  : TIPOS.find((t) => t.valor === d.tipo)?.texto}
              </ThemedText>
            </Pressable>
          ))
        )}
      </Tarjeta>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  navFecha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  centro: { flex: 1, alignItems: 'center', gap: Spacing.one },
  dia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.two,
  },
});

interface ValoresDia {
  tipo: TipoDia;
  horas: Record<string, string>;
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
    Object.fromEntries((existente?.horas ?? []).map((h) => [h.actividadId, String(h.horas)])),
  );
  const [observaciones, setObservaciones] = useState(existente?.observaciones ?? '');
  const total = Object.values(horas).reduce((s, v) => s + (Number(v.replace(',', '.')) || 0), 0);

  return (
    <Tarjeta titulo="Qué has hecho">
      <Selector opciones={TIPOS} valor={tipo} onCambio={setTipo} />
      {tipo === 'trabajo'
        ? actividades.map((a) => (
            <Campo
              key={a.id}
              etiqueta={a.descripcion}
              placeholder="0"
              keyboardType="decimal-pad"
              editable={!bloqueado}
              value={horas[a.id] ?? ''}
              onChangeText={(v) => setHoras((h) => ({ ...h, [a.id]: v }))}
              ayuda="Horas, en tramos de 15 min (p. ej. 1,5)"
            />
          ))
        : null}
      <Campo
        etiqueta="Observaciones"
        multiline
        editable={!bloqueado}
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Opcional"
      />
      {tipo === 'trabajo' ? (
        <ThemedText type="smallBold">Total del día: {formatoHoras(total)}</ThemedText>
      ) : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <View style={estilosComunes.fila}>
        <Boton
          texto={existente ? 'Guardar cambios' : 'Guardar día'}
          onPress={() => onGuardar({ tipo, horas, observaciones })}
          cargando={guardando}
          desactivado={bloqueado}
        />
        {existente && !bloqueado ? (
          <Boton texto="Borrar día" variante="peligro" onPress={onBorrar} />
        ) : null}
      </View>
    </Tarjeta>
  );
}
