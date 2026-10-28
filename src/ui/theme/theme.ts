import '@/ui/theme/global.css';

import { Platform } from 'react-native';

// Sistema de diseño monocromo de Kampus (vault: 03 - Diseño/Sistema de diseño).
// Negro para lo importante, grises para el resto; el color solo marca estados y siempre va con texto.
export const Colors = {
  light: {
    text: '#0A0A0A',
    textSecondary: '#52525B',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    subtle: '#F4F4F5',
    border: '#E4E4E7',
    borderStrong: '#71717A',
    primary: '#0A0A0A',
    onPrimary: '#FFFFFF',
    danger: '#B91C1C',
    estadoValidado: '#15803D',
    // Un punto más oscuro que antes para pasar 4.5:1 también sobre `subtle`.
    estadoPendiente: '#9D5F06',
    estadoAusencia: '#B91C1C',
    // Gris oscurecido para que el festivo llegue a 4.5:1 también sobre `subtle`.
    estadoFestivo: '#6B6B75',
  },
  dark: {
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    background: '#09090B',
    surface: '#18181B',
    subtle: '#27272A',
    border: '#27272A',
    borderStrong: '#A1A1AA',
    primary: '#FAFAFA',
    onPrimary: '#0A0A0A',
    danger: '#F87171',
    estadoValidado: '#4ADE80',
    estadoPendiente: '#FACC15',
    estadoAusencia: '#F87171',
    // En oscuro el gris de antes (#71717A) se quedaba en 3.7:1 sobre `surface`.
    estadoFestivo: '#9A9AA5',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Inter cargada con @expo-google-fonts/inter en app/_layout.tsx. En móvil fontWeight no elige
// la variante de la fuente, así que cada peso es una familia distinta.
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const Fonts = {
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
};

export const Radius = {
  control: 8,
  button: 10,
  card: 14,
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Fondo de marca: el arranque es negro tanto en claro como en oscuro, igual que el icono.
export const FondoMarca = '#0A0A0A';

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
// En web las pestañas son una barra flotante arriba; el contenido empieza debajo.
export const TopTabInset = Platform.OS === 'web' ? 80 : 0;
export const MaxContentWidth = 800;
