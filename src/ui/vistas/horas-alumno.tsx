import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  borrarDiaComoTutor,
  corregirDia,
  listarRegistros,
  mesBloqueadoParaTutor,
  puedeCorregirHoras,
} from '@/core/application/registro-diario';
import type { Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import { ConflictoRegistroError } from '@/core/domain/errores';
import {
  huellaRegistro,
  TIPOS_DIA,
  valoresDeRegistro,
  VALORES_DIA_VACIOS,
  type RegistroDiario,
  type TipoDia,
} from '@/core/domain/registro-diario';
import { mesDe } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Selector } from '@/ui/components/selector';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO } from '@/ui/utils/fechas';

import { CalendarioMes } from './calendario-mes';

const TEXTO_TIPO: Record<TipoDia, string> = {
  trabajo: 'Fichado',
  ausencia: 'Ausencia',
  festivo: 'Festivo',
};

interface Props {
  dossier: Dossier;
  seguimiento: Seguimiento;
  onCambio: () => void;
}

/** Minidesplegable con el calendario de días fichados del alumno. El profe tutor los corrige desde aquí. */
export function HorasAlumno({ dossier, seguimiento, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={styles.bloque}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`Horas fichadas de ${dossier.alumnoNombre}`}
        onPress={() => setAbierto((v) => !v)}
        style={({ pressed }) => [styles.cabecera, pressed && { opacity: 0.6 }]}>
        <ThemedText type="smallBold" style={styles.flex}>
          Horas fichadas
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {abierto ? '⌃' : '⌄'}
        </ThemedText>
      </Pressable>
      {abierto ? (
        <ListaDias dossier={dossier} seguimiento={seguimiento} onCambio={onCambio} />
      ) : null}
    </View>
  );
}

function ListaDias({ dossier, seguimiento, onCambio }: Props) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const hasta = hoy < dossier.fechaFin ? hoy : dossier.fechaFin;
  const { datos, error, cargando, recargar } = useDatos(
    () => listarRegistros(container.registros, dossier.id, dossier.fechaInicio, hasta),
    [dossier.id, dossier.fechaInicio, hasta],
  );
  const [mesElegido, setMesElegido] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const corrige = puedeCorregirHoras(usuario, dossier);

  if (error) return <Mensaje tipo="error" texto={error} />;
  if (cargando && !datos) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Cargando horas…
      </ThemedText>
    );
  }
  const dias = datos ?? [];
  // Sin mes elegido se abre por el último día apuntado: es lo que el tutor viene a revisar.
  const ultimo = dias.reduce((max, d) => (d.fecha > max ? d.fecha : max), '');
  const mes = mesElegido ?? mesDe(ultimo || hasta);
  const bloqueado = (fecha: string) =>
    mesBloqueadoParaTutor(fecha, seguimiento.mensuales, seguimiento.final);
  const registro = dias.find((d) => d.fecha === seleccion) ?? null;
  const editable = seleccion !== null && corrige && !bloqueado(seleccion) && seleccion <= hoy;

  return (
    <View style={styles.lista}>
      {bloqueado(`${mes}-01`) ? <Chip texto="Bloqueado" color="estadoValidado" /> : null}
      <CalendarioMes
        mes={mes}
        onCambiarMes={(m) => {
          setMesElegido(m);
          setSeleccion(null);
        }}
        dias={dias.filter((d) => mesDe(d.fecha) === mes)}
        periodo={dossier}
        hoy={hoy}
        cerrado={seguimiento.mensuales.some((v) => v.mes === mes)}
        seleccionada={seleccion ?? undefined}
        onElegir={(fecha) => {
          // Fija el mes: si se borra su último día, la vista no salta a otro.
          setMesElegido(mes);
          setSeleccion(fecha);
        }}
      />
      {seleccion === null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {corrige
            ? 'Toca un día para ver sus horas o corregirlas.'
            : 'Toca un día para ver sus horas.'}
        </ThemedText>
      ) : editable ? (
        <EditorDia
          key={seleccion}
          dossier={dossier}
          seguimiento={seguimiento}
          fecha={seleccion}
          registro={registro}
          onCerrar={() => setSeleccion(null)}
          onGuardado={() => {
            setSeleccion(null);
            recargar();
            onCambio();
          }}
        />
      ) : (
        <DetalleDia
          dossier={dossier}
          fecha={seleccion}
          registro={registro}
          nota={
            corrige && bloqueado(seleccion)
              ? seguimiento.final
                ? 'El alumno ya tiene valoración final.'
                : 'Mes confirmado: quita antes la confirmación para corregirlo.'
              : corrige && seleccion > hoy
                ? 'Este día todavía no ha llegado.'
                : null
          }
        />
      )}
    </View>
  );
}

function DetalleDia({
  dossier,
  fecha,
  registro,
  nota,
}: {
  dossier: Dossier;
  fecha: string;
  registro: RegistroDiario | null;
  nota: string | null;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.editor, { borderColor: theme.border }]}>
      <ThemedText type="smallBold">
        {fechaCorta(fecha)}
        {registro ? ` · ${TEXTO_TIPO[registro.tipo]}` : ''}
      </ThemedText>
      {registro ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Sin apuntar.
        </ThemedText>
      )}
      {registro?.horas.map((h) => (
        <ThemedText key={h.actividadId} type="small">
          {dossier.actividades.find((a) => a.id === h.actividadId)?.descripcion ?? 'Actividad'}:{' '}
          {formatoHoras(h.horas)}
        </ThemedText>
      ))}
      {registro?.observaciones ? (
        <ThemedText type="small" themeColor="textSecondary">
          {registro.observaciones}
        </ThemedText>
      ) : null}
      {nota ? (
        <ThemedText type="small" themeColor="textSecondary">
          {nota}
        </ThemedText>
      ) : null}
    </View>
  );
}

function EditorDia({
  dossier,
  seguimiento,
  fecha,
  registro,
  onCerrar,
  onGuardado,
}: {
  dossier: Dossier;
  seguimiento: Seguimiento;
  fecha: string;
  registro: RegistroDiario | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const inicial = registro ? valoresDeRegistro(registro) : VALORES_DIA_VACIOS;
  const [tipo, setTipo] = useState<TipoDia>(inicial.tipo);
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [horas, setHoras] = useState<Record<string, string>>(
    Object.fromEntries(inicial.horas.map((h) => [h.actividadId, String(h.horas)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const puertos = { registros: container.registros, valoraciones: container.valoraciones };

  const valorado = seguimiento.mensuales.some((v) => v.mes === mesDe(fecha));

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    setGuardando(true);
    try {
      await accion();
      onGuardado();
    } catch (e) {
      setError(
        e instanceof ConflictoRegistroError
          ? 'Este día ha cambiado mientras lo corregías. Ciérralo y vuelve a abrirlo.'
          : e instanceof Error
            ? e.message
            : 'No se pudo guardar. Vuelve a intentarlo.',
      );
    } finally {
      setGuardando(false);
    }
  }

  function guardar() {
    const lineas = dossier.actividades.flatMap((a) => {
      const texto = horas[a.id]?.trim().replace(',', '.');
      return texto ? [{ actividadId: a.id, horas: Number(texto) }] : [];
    });
    void ejecutar(() =>
      corregirDia(
        puertos,
        usuario,
        dossier,
        fecha,
        { tipo, horas: tipo === 'trabajo' ? lineas : [], observaciones },
        huellaRegistro(registro),
      ),
    );
  }

  return (
    <View style={[styles.editor, { borderColor: theme.borderStrong }]}>
      <ThemedText type="smallBold">
        {registro ? 'Corregir' : 'Añadir'} {fechaCorta(fecha)}
      </ThemedText>
      <Selector
        etiqueta="Tipo de día"
        opciones={TIPOS_DIA.map((t) => ({ valor: t, texto: TEXTO_TIPO[t] }))}
        valor={tipo}
        onCambio={setTipo}
      />
      {tipo === 'trabajo'
        ? dossier.actividades.map((a) => (
            <Campo
              key={a.id}
              etiqueta={a.descripcion}
              keyboardType="decimal-pad"
              value={horas[a.id] ?? ''}
              onChangeText={(v) => setHoras((h) => ({ ...h, [a.id]: v }))}
              ayuda="Horas, en cuartos: 1,25"
            />
          ))
        : null}
      <Campo
        etiqueta="Observaciones"
        multiline
        value={observaciones}
        onChangeText={setObservaciones}
      />
      {valorado ? (
        <Mensaje
          tipo="error"
          texto="La empresa ya valoró este mes con las horas anteriores. Avísala si cambias algo."
        />
      ) : null}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <View style={styles.botones}>
        <Boton texto="Guardar" cargando={guardando} onPress={guardar} />
        <Boton texto="Cancelar" variante="secundario" desactivado={guardando} onPress={onCerrar} />
        {registro ? (
          <Boton
            texto={confirmandoBorrado ? 'Confirmar borrado' : 'Borrar día'}
            variante="secundario"
            desactivado={guardando}
            onPress={() =>
              confirmandoBorrado
                ? void ejecutar(() => borrarDiaComoTutor(puertos, usuario, dossier, registro))
                : setConfirmandoBorrado(true)
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: Spacing.two },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  flex: { flex: 1, gap: Spacing.half },
  lista: { gap: Spacing.two },
  editor: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
