import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/ui/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/ui/components/animated-icon';
import { SesionProvider, useSesion } from '@/ui/hooks/use-sesion';
import { Colors } from '@/ui/theme/theme';
import { Pantalla } from '@/ui/components/pantalla';
import { ErrorCarga } from '@/ui/vistas/comun';
import { VistaLogin } from '@/ui/vistas/login';

SplashScreen.preventAutoHideAsync();

// Al entrar directo por URL a una pantalla de la pila, las pestañas quedan debajo para poder volver.
export const unstable_settings = { anchor: '(tabs)' };

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
      <SesionProvider>
        <AnimatedSplashOverlay />
        <Contenido />
      </SesionProvider>
    </ThemeProvider>
  );
}

/** Sin sesión se ve el login; con sesión, las pestañas de su rol. */
function Contenido() {
  const { usuario, cargando, error, reintentar } = useSesion();
  const colores = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  if (cargando) return null;
  if (error)
    return (
      <Pantalla titulo="Sesión">
        <ErrorCarga texto={error} onReintentar={reintentar} />
      </Pantalla>
    );
  if (!usuario) return <VistaLogin />;
  // Las pestañas nativas no pueden abrir una pestaña oculta: Registrar, Centro y Alumnos van en una pila
  // por encima de las pestañas, con su propio botón de volver.
  // Cabecera solo con el botón de volver (el título ya lo pone la pantalla).
  // Opaca y del color del fondo, para que no tape el título de la pantalla.
  const encima = {
    headerShown: true,
    title: '',
    headerBackTitle: 'Volver',
    headerShadowVisible: false,
    headerTransparent: false,
    headerStyle: { backgroundColor: colores.background },
    headerTintColor: colores.primary,
  };
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="registro" options={encima} />
      <Stack.Screen name="centro" options={encima} />
      <Stack.Screen name="alumnos" options={encima} />
    </Stack>
  );
}
