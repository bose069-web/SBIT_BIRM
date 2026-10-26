import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/ui/components/animated-icon';
import AppTabs from '@/ui/components/app-tabs';
import { Colors } from '@/ui/theme/theme';

SplashScreen.preventAutoHideAsync();

function temaNavegacion(modo: 'light' | 'dark'): Theme {
  const base = modo === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[modo];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
  };
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fuentesCargadas] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  // Mientras carga Inter se mantiene la pantalla de inicio nativa.
  if (!fuentesCargadas) return null;

  return (
    <ThemeProvider value={temaNavegacion(colorScheme === 'dark' ? 'dark' : 'light')}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
