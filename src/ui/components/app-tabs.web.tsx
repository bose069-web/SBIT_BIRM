import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, Pressable, View, StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';

import type { Rol } from '@/core/domain/usuario';

import {
  cambiarEsquemaWeb,
  ponerDesplazado,
  useDesplazado,
  useEsquemaWeb,
} from '@/ui/estado/preferencias-web';
import { useTheme } from '@/ui/hooks/use-theme';
import { Movimiento, Radius, Spacing } from '@/ui/theme/theme';

import { ThemedText } from './themed-text';

const LOGOTIPO = {
  light: require('@/assets/brand/kampus-logotipo.png'),
  dark: require('@/assets/brand/kampus-logotipo-blanco.png'),
};
const ALTO_LOGO = 28;
// El logotipo mide 1360 × 384.
const ANCHO_LOGOTIPO = Math.round((ALTO_LOGO * 1360) / 384);
// Al recoger, se recorta el mismo logotipo y solo queda su K (llega a x = 63 de 340): así la
// marca no cambia de tamaño ni de resolución.
const ANCHO_MARCA = Math.ceil((ALTO_LOGO * 66) / 96);
const ANCHO_PALABRA = ANCHO_LOGOTIPO - ANCHO_MARCA;

// Propiedades solo de la web (cristal y transiciones); react-native-web las pasa tal cual al CSS.
const cristalWeb = {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
} as unknown as ViewStyle;
const transicion = (propiedad: string): ViewStyle & ImageStyle =>
  ({
    transitionProperty: propiedad,
    transitionDuration: `${Movimiento.normal}ms`,
    transitionTimingFunction: 'ease-out',
  }) as unknown as ViewStyle & ImageStyle;

export default function AppTabs({ rol }: { rol: Rol }) {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Inicio</TabButton>
          </TabTrigger>
          <TabTrigger name="calendario" href="/calendario" asChild>
            <TabButton>Calendario</TabButton>
          </TabTrigger>
          <TabTrigger name="chat" href="/chat" asChild>
            <TabButton>Chat</TabButton>
          </TabTrigger>
          {/* Registrar y Centro siguen siendo rutas (si no, no se puede navegar a ellas), pero se
              abren desde Inicio, no desde la barra. */}
          <TabTrigger name="registro" href="/registro" style={{ display: 'none' }} />
          <TabTrigger name="centro" href="/centro" style={{ display: 'none' }} />
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
          <BotonEsquema />
          {/* Como en anthropic.com: una sola acción destacada, en píldora oscura, al final. */}
          {rol === 'alumno' ? <BotonDestacado texto="Registrar hoy" href="/registro" /> : null}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// `ref` se descarta: el tipo de expo-router/ui no encaja con el de Pressable en RN 0.88 y la navegación va por onPress.
export function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.tabButtonView}>
        <ThemedText
          type={isFocused ? 'smallBold' : 'small'}
          themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const esquema = useEsquemaWeb();
  const desplazado = useDesplazado();

  // Escucha el scroll de cualquier zona de la página (cada pantalla tiene su propio ScrollView).
  useEffect(() => {
    const alDesplazar = (e: Event) => {
      const el = e.target instanceof Element ? e.target : document.scrollingElement;
      ponerDesplazado((el?.scrollTop ?? 0) > 24);
    };
    document.addEventListener('scroll', alDesplazar, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', alDesplazar, { capture: true });
  }, []);

  return (
    // Barra a todo el ancho del color del fondo; al bajar se vuelve translúcida con una línea fina.
    <View
      {...props}
      accessibilityRole="tablist"
      style={[
        styles.tabListContainer,
        cristalWeb,
        transicion('background-color, border-color'),
        {
          backgroundColor: desplazado ? theme.cristal : theme.background,
          borderBottomColor: desplazado ? theme.border : 'transparent',
        },
      ]}>
      <View style={styles.innerContainer}>
        {/* Al bajar, la palabra se desliza hacia la izquierda y se esconde detrás de la K; al
            volver arriba sale deslizándose. Son dos recortes del mismo logotipo. */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Kampus, ir a Inicio"
          onPress={() => router.navigate('/')}
          style={({ pressed }) => [
            pressed && styles.pressed,
            styles.logo,
            transicion('width'),
            { width: desplazado ? ANCHO_MARCA : ANCHO_LOGOTIPO },
          ]}>
          <View style={styles.zonaPalabra}>
            <View
              style={[
                styles.palabra,
                transicion('transform, opacity'),
                {
                  opacity: desplazado ? 0 : 1,
                  transform: [{ translateX: desplazado ? -ANCHO_PALABRA : 0 }],
                },
              ]}>
              <Image source={LOGOTIPO[esquema]} style={[styles.logotipo, { left: -ANCHO_MARCA }]} />
            </View>
          </View>
          <View style={styles.k}>
            <Image source={LOGOTIPO[esquema]} style={styles.logotipo} />
          </View>
        </Pressable>

        {props.children}
      </View>
    </View>
  );
}

function BotonDestacado({ texto, href }: { texto: string; href: '/registro' }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [
        styles.destacado,
        { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.background }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function BotonEsquema() {
  const theme = useTheme();
  const oscuro = useEsquemaWeb() === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onPress={() => cambiarEsquemaWeb(oscuro ? 'light' : 'dark')}
      style={({ pressed }) => [styles.botonEsquema, pressed && { backgroundColor: theme.subtle }]}>
      <svg
        aria-hidden
        focusable="false"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={theme.text}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block' }}>
        {oscuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: 1200,
  },
  logo: { height: ALTO_LOGO, marginRight: 'auto', overflow: 'hidden' },
  zonaPalabra: {
    position: 'absolute',
    left: ANCHO_MARCA,
    width: ANCHO_PALABRA,
    height: ALTO_LOGO,
    overflow: 'hidden',
  },
  palabra: { width: ANCHO_PALABRA, height: ALTO_LOGO, overflow: 'hidden' },
  k: { position: 'absolute', left: 0, width: ANCHO_MARCA, height: ALTO_LOGO, overflow: 'hidden' },
  logotipo: { position: 'absolute', left: 0, width: ANCHO_LOGOTIPO, height: ALTO_LOGO },
  destacado: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    marginLeft: Spacing.one,
  },
  botonEsquema: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    justifyContent: 'center',
  },
});
