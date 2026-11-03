import { StyleSheet, View } from 'react-native';

import { nivelContrasena } from '@/core/domain/perfil';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { t } from '@/ui/utils/idioma';

const NIVELES: { texto: string; color: ThemeColor }[] = [
  { texto: 'Poco segura', color: 'danger' },
  { texto: 'Aceptable', color: 'estadoPendiente' },
  { texto: 'Bien', color: 'estadoValidado' },
  { texto: 'Muy segura', color: 'estadoValidado' },
];

/** Barra de seguridad de una contraseña nueva. Sin texto escrito no se muestra. */
export function BarraContrasena({ contrasena }: { contrasena: string }) {
  const theme = useTheme();
  if (!contrasena) return null;
  const nivel = nivelContrasena(contrasena);
  const { texto, color } = NIVELES[nivel];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${t('Seguridad de la contraseña')}: ${t(texto)}`}
      accessibilityValue={{ min: 0, max: 3, now: nivel }}
      style={styles.caja}>
      <View style={styles.tramos}>
        {NIVELES.map((_, i) => (
          <View
            key={i}
            style={[styles.tramo, { backgroundColor: i <= nivel ? theme[color] : theme.subtle }]}
          />
        ))}
      </View>
      <ThemedText type="small" style={{ color: theme[color] }}>
        {t(texto)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.one },
  tramos: { flexDirection: 'row', gap: Spacing.one },
  tramo: { flex: 1, height: 6, borderRadius: Radius.pill },
});
