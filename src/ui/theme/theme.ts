import '@/ui/theme/global.css';

import { Platform } from 'react-native';

// Sistema de diseño de Kampus (vault: 03 - Diseño/Sistema de diseño).
// Monocromo con un único acento azul (`primary`): botón principal, selección, hoy, progreso y
// pestaña activa. El resto del color solo marca estados y siempre va con texto.
export const Colors = {
  light: {
    // Neutros cálidos tipo marfil (como anthropic.com): fondo crema y texto casi negro.
    text: '#141413',
    textSecondary: '#5E5D59',
    background: '#F5F4EE',
    surface: '#FAF9F5',
    subtle: '#F0EEE6',
    border: '#E8E6DC',
    borderStrong: '#87867F',
    // #2563EB sobre blanco: 5.2:1.
    primary: '#2563EB',
    onPrimary: '#FFFFFF',
    primarySuave: '#DBEAFE',
    // Superficies de cristal (Liquid Glass): translúcidas sobre el fondo.
    cristal: 'rgba(250,249,245,0.72)',
    cristalBorde: 'rgba(232,230,220,0.9)',
    danger: '#B91C1C',
    // Avisos por días sin apuntar: amarillo y naranja oscurecidos para leerse sobre blanco (4.5:1).
    avisoLeve: '#A16207',
    avisoMedio: '#C2410C',
    estadoValidado: '#15803D',
    // Un punto más oscuro que antes para pasar 4.5:1 también sobre `subtle`.
    estadoPendiente: '#9D5F06',
    estadoAusencia: '#B91C1C',
    // Gris oscurecido para que el festivo llegue a 4.5:1 también sobre `subtle`.
    estadoFestivo: '#6B6B75',
  },
  dark: {
    // Grises «carbón cálido»: fondo menos negro y un tinte cálido suave.
    text: '#F5F3F0',
    textSecondary: '#A8A39C',
    background: '#141312',
    surface: '#1E1D1B',
    subtle: '#2A2826',
    border: '#3A3734',
    borderStrong: '#A8A39C',
    // El mismo azul que en claro, con texto blanco encima.
    primary: '#2563EB',
    onPrimary: '#FFFFFF',
    primarySuave: '#172554',
    cristal: 'rgba(30,29,27,0.72)',
    cristalBorde: 'rgba(255,255,255,0.08)',
    danger: '#F87171',
    avisoLeve: '#FACC15',
    avisoMedio: '#FB923C',
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
  button: 12,
  card: 18,
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

// Duraciones de animación (ms). Salir siempre más rápido que entrar; con "reducir movimiento"
// activado no se anima.
export const Movimiento = {
  rapido: 150,
  normal: 250,
  entrada: 350,
} as const;

// Fondo de marca: el arranque es negro tanto en claro como en oscuro, igual que el icono.
export const FondoMarca = '#0A0A0A';

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
// En web las pestañas son una barra flotante arriba; el contenido empieza debajo.
export const TopTabInset = Platform.OS === 'web' ? 80 : 0;
export const MaxContentWidth = 800;
