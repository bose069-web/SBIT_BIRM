import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta } from '@/ui/utils/fechas';

interface Props {
  /** `AAAA-MM-DD` de la fecha límite; sin ella, la insignia solo dice "Vencida". */
  fecha?: string | null;
  texto?: string;
}

/** Aviso de que una tarea pendiente pasó su fecha límite. Lleva fecha y texto, no solo color. */
export function InsigniaVencida({ fecha, texto = 'Vencida' }: Props) {
  const theme = useTheme();
  const etiqueta = fecha ? `${texto}: ${fechaCorta(fecha)}` : texto;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={etiqueta}
      style={[styles.insignia, { borderColor: theme.danger, backgroundColor: theme.subtle }]}>
      <ThemedText type="smallBold" style={{ color: theme.danger }}>
        {texto}
      </ThemedText>
      {fecha ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {fechaCorta(fecha)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
