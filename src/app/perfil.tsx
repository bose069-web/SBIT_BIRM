import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/ui/components/themed-text';
import { ThemedView } from '@/ui/components/themed-view';
import { useUsuarioActual } from '@/ui/hooks/use-usuario-actual';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/ui/theme/theme';

export default function PerfilScreen() {
  const { usuario, cargando } = useUsuarioActual();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Perfil</ThemedText>
        {cargando ? (
          <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
        ) : usuario ? (
          <>
            <ThemedText>{usuario.nombre}</ThemedText>
            <ThemedText themeColor="textSecondary">{usuario.email}</ThemedText>
            <ThemedText themeColor="textSecondary">Rol: {usuario.rol}</ThemedText>
          </>
        ) : (
          <ThemedText themeColor="textSecondary">No has iniciado sesión.</ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    // En el contenedor y no en SafeAreaView, que sobrescribe su paddingTop con el inset del sistema.
    paddingTop: TopTabInset + Spacing.five,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
});
