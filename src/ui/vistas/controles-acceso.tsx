import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/ui/components/themed-text';
import { cambiarEsquemaWeb } from '@/ui/estado/preferencias-web';
import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useIdioma } from '@/ui/hooks/use-idioma';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { t } from '@/ui/utils/idioma';
import { OPCIONES_IDIOMA } from '@/ui/utils/traducciones/opciones';

/** Idioma (ES/CA) y modo claro u oscuro, pequeños, para la cabecera del acceso. */
export function ControlesAcceso() {
  const theme = useTheme();
  const oscuro = useColorScheme() === 'dark';
  const { idioma, cambiarIdioma } = useIdioma();

  return (
    <View style={styles.fila}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('Idioma')}
        style={[styles.grupo, { borderColor: theme.border }]}>
        {OPCIONES_IDIOMA.map((o) => {
          const activo = o.valor === idioma;
          return (
            <Pressable
              key={o.valor}
              accessibilityRole="radio"
              accessibilityLabel={o.texto}
              accessibilityState={{ checked: activo }}
              aria-checked={activo}
              onPress={() => cambiarIdioma(o.valor)}
              style={({ pressed }) => [
                styles.idioma,
                activo && { backgroundColor: theme.subtle },
                pressed && { opacity: 0.6 },
              ]}>
              <ThemedText
                type="smallBold"
                themeColor={activo ? 'text' : 'textSecondary'}
                style={styles.codigo}>
                {o.valor.toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')}
        onPress={() => cambiarEsquemaWeb(oscuro ? 'light' : 'dark')}
        style={({ pressed }) => [
          styles.modo,
          { borderColor: theme.border },
          pressed && { opacity: 0.6 },
        ]}>
        {oscuro ? <Sol color={theme.text} /> : <Luna color={theme.text} />}
      </Pressable>
    </View>
  );
}

function Sol({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Luna({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  grupo: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.pill, padding: 2 },
  idioma: {
    minWidth: 44,
    minHeight: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  codigo: { letterSpacing: 0.5 },
  modo: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
