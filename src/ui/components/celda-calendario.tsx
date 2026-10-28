import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras } from '@/ui/utils/fechas';

export type EstadoCeldaCalendario =
  | 'validado'
  | 'registrado'
  | 'pendiente'
  | 'ausencia'
  | 'festivo'
  | 'sin_registro'
  | 'fuera_periodo';

export const TEXTO_ESTADO_CELDA: Record<EstadoCeldaCalendario, string> = {
  validado: 'Validado',
  registrado: 'Registrado',
  pendiente: 'Pendiente',
  ausencia: 'Ausencia',
  festivo: 'Festivo',
  sin_registro: 'Sin registro',
  fuera_periodo: 'Fuera del periodo',
};

const COLOR_ESTADO: Record<EstadoCeldaCalendario, ThemeColor> = {
  validado: 'estadoValidado',
  registrado: 'primary',
  pendiente: 'estadoPendiente',
  ausencia: 'estadoAusencia',
  festivo: 'estadoFestivo',
  sin_registro: 'borderStrong',
  fuera_periodo: 'border',
};

interface Props {
  fecha: string;
  estado: EstadoCeldaCalendario;
  horas?: number;
  esHoy?: boolean;
  seleccionada?: boolean;
  onPress?: (fecha: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function CeldaCalendario({
  fecha,
  estado,
  horas,
  esHoy,
  seleccionada,
  onPress,
  style,
}: Props) {
  const theme = useTheme();
  const dia = Number(fecha.slice(8, 10));
  const interactiva = !!onPress && estado !== 'fuera_periodo';
  const colorPunto = theme[COLOR_ESTADO[estado]];
  const etiqueta = [
    fechaCorta(fecha),
    esHoy ? 'hoy' : null,
    TEXTO_ESTADO_CELDA[estado],
    horas ? formatoHoras(horas) : null,
  ]
    .filter(Boolean)
    .join(', ');

  const contenido = (
    <>
      <View style={styles.fila}>
        <View style={[styles.numero, esHoy && { backgroundColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            themeColor={
              esHoy ? 'onPrimary' : estado === 'fuera_periodo' ? 'textSecondary' : 'text'
            }>
            {dia}
          </ThemedText>
        </View>
        {estado === 'fuera_periodo' ? null : (
          <View
            style={[
              styles.punto,
              estado === 'sin_registro'
                ? { borderColor: colorPunto, borderWidth: 1 }
                : { backgroundColor: colorPunto },
            ]}
          />
        )}
      </View>
      {horas ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.horas}>
          {formatoHoras(horas)}
        </ThemedText>
      ) : null}
    </>
  );

  const estilo = [
    styles.celda,
    {
      backgroundColor: estado === 'fuera_periodo' ? 'transparent' : theme.surface,
      borderColor: seleccionada ? theme.primary : theme.border,
      borderWidth: seleccionada ? 2 : 1,
      opacity: estado === 'fuera_periodo' ? 0.5 : 1,
    },
    style,
  ];

  if (!interactiva) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={etiqueta} style={estilo}>
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abre el registro de ese día"
      accessibilityState={{ selected: !!seleccionada }}
      onPress={() => onPress(fecha)}
      style={estilo}>
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  celda: {
    flexGrow: 1,
    flexBasis: 40,
    minWidth: 44,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.control,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  numero: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  horas: {
    fontSize: 11,
    lineHeight: 13,
  },
});
