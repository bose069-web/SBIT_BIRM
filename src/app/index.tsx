import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/container';
import { comprobarConexion } from '@/core/application/auth';
import { HintRow } from '@/ui/components/hint-row';
import { ThemedText } from '@/ui/components/themed-text';
import { ThemedView } from '@/ui/components/themed-view';
import { useTheme } from '@/ui/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/ui/theme/theme';

type Estado = 'comprobando' | 'conectado' | 'error';

const textoEstado: Record<Estado, string> = {
  comprobando: 'Comprobando…',
  conectado: 'Conectado ✅',
  error: 'Sin conexión ❌',
};

export default function InicioScreen() {
  const theme = useTheme();
  const [estado, setEstado] = useState<Estado>('comprobando');

  useEffect(() => {
    comprobarConexion(container.auth).then((ok) => setEstado(ok ? 'conectado' : 'error'));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.hero}>
          <ThemedText type="title">Kampus</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centrado}>
            Tu centro educativo en el móvil
          </ThemedText>
        </ThemedView>

        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <HintRow
            title="Backend"
            hint={<ThemedText type="small">{container.auth.nombre}</ThemedText>}
          />
          <HintRow
            title="Estado"
            hint={<ThemedText type="small">{textoEstado[estado]}</ThemedText>}
          />
          <HintRow title="Equipo" hint={<ThemedText type="small">TEAM BIRM</ThemedText>} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  centrado: {
    textAlign: 'center',
  },
  panel: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
});
