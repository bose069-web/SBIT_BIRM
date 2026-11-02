import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius } from '@/ui/theme/theme';

/** Dos iniciales: la del nombre y la de la siguiente palabra. */
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  return palabras
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

/** Iniciales en un círculo. Es decorativo: el nombre siempre va escrito al lado. */
export function Avatar({ nombre, tamano = 40 }: { nombre: string; tamano?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { width: tamano, height: tamano, backgroundColor: theme.fondoTrabajo },
      ]}>
      <ThemedText
        themeColor="textoTrabajo"
        style={{
          fontFamily: FontFamily.semibold,
          fontSize: tamano * 0.38,
          lineHeight: tamano * 0.5,
        }}>
        {iniciales(nombre)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
});
