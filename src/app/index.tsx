import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Estado = 'comprobando' | 'conectado' | 'sin-configurar' | 'error';

const textoEstado: Record<Estado, string> = {
  comprobando: 'Comprobando…',
  conectado: 'Conectado ✅',
  'sin-configurar': 'Falta .env.local ⚠️',
  error: 'Error de conexión ❌',
};

export default function InicioScreen() {
  const [estado, setEstado] = useState<Estado>(
    isSupabaseConfigured ? 'comprobando' : 'sin-configurar',
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth
      .getSession()
      .then(({ error }) => setEstado(error ? 'error' : 'conectado'))
      .catch(() => setEstado('error'));
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

        <ThemedView type="backgroundElement" style={styles.panel}>
          <HintRow
            title="Supabase"
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
    borderRadius: Spacing.four,
  },
});
