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
  totalHoras,
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
import { SelectorFecha } from '@/ui/components/selector-fecha';
import { Selector } from '@/ui/components/selector';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';

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

/** Minidesplegable con los días fichados del alumno. El profe tutor los corrige desde aquí. */
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
  const theme = useTheme();
  const hoy = hoyISO();
  const hasta = hoy < dossier.fechaFin ? hoy : dossier.fechaFin;
  const { datos, error, cargando, recargar } = useDatos(
    () => listarRegistros(container.registros, dossier.id, dossier.fechaInicio, hasta),
    [dossier.id, dossier.fechaInicio, hasta],
  );
  // `fecha` del día abierto; 'nuevo' para añadir uno que falta.
  const [editando, setEditando] = useState<string | null>(null);
  const corrige = puedeCorregirHoras(usuario, dossier);

  function alGuardar() {
    setEditando(null);
    recargar();
    onCambio();
  }

  if (error) return <Mensaje tipo="error" texto={error} />;
  if (cargando && !datos) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Cargando horas…
      </ThemedText>
    );
  }
  const dias = [...(datos ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const meses = [...new Set(dias.map((d) => mesDe(d.fecha)))];
  const bloqueado = (fecha: string) =>
    mesBloqueadoParaTutor(fecha, seguimiento.mensuales, seguimiento.final);

  return (
    <View style={styles.lista}>
      {corrige && !seguimiento.final ? (
        editando === 'nuevo' ? (
          <EditorDia
            dossier={dossier}
            seguimiento={seguimiento}
            dias={dias}
            onCerrar={() => setEditando(null)}
            onGuardado={alGuardar}
          />
        ) : (
          <Boton texto="Añadir día" variante="secundario" onPress={() => setEditando('nuevo')} />
        )
      ) : null}
      {dias.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay días apuntados.
        </ThemedText>
      ) : null}
      {meses.map((mes) => (
        <View key={mes} style={styles.lista}>
          <View style={styles.cabeceraMes}>
            <ThemedText type="smallBold" style={styles.flex}>
              {nombreMes(mes)}
            </ThemedText>
            {bloqueado(`${mes}-01`) ? <Chip texto="Bloqueado" color="estadoValidado" /> : null}
          </View>
          {dias
            .filter((d) => mesDe(d.fecha) === mes)
            .map((dia) =>
              editando === dia.fecha ? (
                <EditorDia
                  key={dia.id}
                  dossier={dossier}
                  seguimiento={seguimiento}
                  dias={dias}
                  registro={dia}
                  onCerrar={() => setEditando(null)}
                  onGuardado={alGuardar}
                />
              ) : (
                <Pressable
                  key={dia.id}
                  disabled={!corrige || bloqueado(dia.fecha)}
                  accessibilityRole={corrige && !bloqueado(dia.fecha) ? 'button' : undefined}
                  accessibilityLabel={`${fechaCorta(dia.fecha)}, ${TEXTO_TIPO[dia.tipo]}, ${formatoHoras(totalHoras(dia))}${corrige && !bloqueado(dia.fecha) ? '. Corregir' : ''}`}
                  onPress={() => setEditando(dia.fecha)}
                  style={({ pressed }) => [
                    styles.dia,
                    { borderColor: theme.border },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <View style={styles.flex}>
                    <ThemedText type="small">{fechaCorta(dia.fecha)}</ThemedText>
                    {dia.observaciones ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {dia.observaciones}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {dia.tipo === 'trabajo' ? formatoHoras(totalHoras(dia)) : TEXTO_TIPO[dia.tipo]}
                  </ThemedText>
                  {corrige && !bloqueado(dia.fecha) ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Corregir ›
                    </ThemedText>
                  ) : null}
                </Pressable>
              ),
            )}
        </View>
      ))}
    </View>
  );
}

function EditorDia({
  dossier,
  seguimiento,
  dias,
  registro = null,
  onCerrar,
  onGuardado,
}: {
  dossier: Dossier;
  seguimiento: Seguimiento;
  dias: RegistroDiario[];
  registro?: RegistroDiario | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const inicial = registro ? valoresDeRegistro(registro) : VALORES_DIA_VACIOS;
  const [fecha, setFecha] = useState(registro?.fecha ?? '');
  const [tipo, setTipo] = useState<TipoDia>(inicial.tipo);
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [horas, setHoras] = useState<Record<string, string>>(
    Object.fromEntries(inicial.horas.map((h) => [h.actividadId, String(h.horas)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const puertos = { registros: container.registros, valoraciones: container.valoraciones };

  // Elegir un día que ya existe corrige ese día: su versión es la base, para no pisarlo a ciegas.
  const existente = registro ?? dias.find((d) => d.fecha === fecha) ?? null;
  const valorado = fecha !== '' && seguimiento.mensuales.some((v) => v.mes === mesDe(fecha));

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
    if (!fecha) {
      setError('Elige el día');
      return;
    }
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
        huellaRegistro(existente),
      ),
    );
  }

  return (
    <View style={[styles.editor, { borderColor: theme.borderStrong }]}>
      {registro ? (
        <ThemedText type="smallBold">Corregir {fechaCorta(registro.fecha)}</ThemedText>
      ) : (
        <SelectorFecha etiqueta="Día" valor={fecha} onCambio={setFecha} />
      )}
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
  cabeceraMes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.half },
  lista: { gap: Spacing.two },
  dia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  editor: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
