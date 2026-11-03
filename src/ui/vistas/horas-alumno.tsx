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
import { Leyenda } from '@/ui/components/leyenda';
import { Mensaje } from '@/ui/components/mensaje';
import { Selector } from '@/ui/components/selector';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { sumarMeses } from '@/ui/utils/calendario';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';

import { LEYENDA_DIAS } from './calendario-mes';
import { MiniCalendario } from './mini-calendario';
import { t } from '@/ui/utils/idioma';

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

/** Mini calendario con los días fichados del alumno. El profe tutor los corrige desde aquí. */
export function HorasAlumno({ dossier, seguimiento, onCambio }: Props) {
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
        {t('Cargando horas…')}
      </ThemedText>
    );
  }
  const dias = datos ?? [];
  // Sin mes elegido se abre por el último día apuntado: es lo que el tutor viene a revisar.
  const ultimo = dias.reduce((max, d) => (d.fecha > max ? d.fecha : max), '');
  const mes = mesElegido ?? mesDe(ultimo || hasta);
  const bloqueado = (fecha: string) =>
    mesBloqueadoParaTutor(fecha, seguimiento.mensuales, seguimiento.final);
  const delMes = dias.filter((d) => mesDe(d.fecha) === mes);
  const cambiarMes = (m: string) => {
    setMesElegido(m);
    setSeleccion(null);
  };
  const registro = dias.find((d) => d.fecha === seleccion) ?? null;
  const editable = seleccion !== null && corrige && !bloqueado(seleccion) && seleccion <= hoy;

  return (
    <View style={styles.lista}>
      <View style={styles.cabecera}>
        <BotonMes
          texto="‹"
          etiqueta={t('Mes anterior')}
          desactivado={mes <= mesDe(dossier.fechaInicio)}
          onPress={() => cambiarMes(sumarMeses(mes, -1))}
        />
        <View style={styles.titulo}>
          <ThemedText type="smallBold">{nombreMes(mes)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatoHoras(delMes.reduce((suma, d) => suma + totalHoras(d), 0))}
          </ThemedText>
        </View>
        <BotonMes
          texto="›"
          etiqueta={t('Mes siguiente')}
          desactivado={mes >= mesDe(dossier.fechaFin)}
          onPress={() => cambiarMes(sumarMeses(mes, 1))}
        />
      </View>
      {bloqueado(`${mes}-01`) ? <Chip texto={t('Bloqueado')} color="estadoValidado" /> : null}
      <MiniCalendario
        hoy={hoy}
        cabecera={false}
        mes={mes}
        registros={delMes}
        periodo={dossier}
        seleccionada={seleccion}
        onElegir={(fecha) => {
          // Fija el mes: si se borra su último día, la vista no salta a otro.
          setMesElegido(mes);
          setSeleccion(fecha);
        }}
      />
      <Leyenda elementos={LEYENDA_DIAS} />
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

function BotonMes({
  texto,
  etiqueta,
  desactivado,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  desactivado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: desactivado }}
      disabled={desactivado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botonMes,
        { opacity: desactivado ? 0.35 : pressed ? 0.6 : 1 },
      ]}>
      <ThemedText type="smallBold">{texto}</ThemedText>
    </Pressable>
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
          {t('Sin apuntar.')}
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
        etiqueta={t('Tipo de día')}
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
              ayuda={t('Horas, en cuartos: 1,25')}
            />
          ))
        : null}
      <Campo
        etiqueta={t('Observaciones')}
        multiline
        value={observaciones}
        onChangeText={setObservaciones}
      />
      {valorado ? (
        <Mensaje
          tipo="error"
          texto={t(
            'La empresa ya valoró este mes con las horas anteriores. Avísala si cambias algo.',
          )}
        />
      ) : null}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <View style={styles.botones}>
        <Boton texto={t('Guardar')} cargando={guardando} onPress={guardar} />
        <Boton
          texto={t('Cancelar')}
          variante="secundario"
          desactivado={guardando}
          onPress={onCerrar}
        />
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
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  titulo: { flex: 1, alignItems: 'center' },
  botonMes: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lista: { gap: Spacing.two },
  editor: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
