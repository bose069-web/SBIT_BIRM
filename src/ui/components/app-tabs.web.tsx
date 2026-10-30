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
import { Image, Pressable, View, StyleSheet, type ViewStyle } from 'react-native';

import type { Rol } from '@/core/domain/usuario';

import {
  cambiarEsquemaWeb,
  ponerDesplazado,
  useDesplazado,
  useEsquemaWeb,
} from '@/ui/estado/preferencias-web';
import { useTheme } from '@/ui/hooks/use-theme';
import { useMovimientoReducido } from '@/ui/hooks/use-movimiento-reducido';
import { fondoHoverWeb, transicionWeb, type EstadoPressable } from '@/ui/utils/interaccion-web';
import { Radius, Spacing } from '@/ui/theme/theme';

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

export default function AppTabs({ rol }: { rol: Rol }) {
  // El profe no usa calendario: en esa pestaña tiene el seguimiento de su clase.
  const profe = rol === 'profe';
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton href="/">Inicio</TabButton>
          </TabTrigger>
          {/* El profe no tiene calendario: esa pestaña es el seguimiento de su clase. La empresa
              tampoco: lo que necesita son los informes que le toca validar. Las rutas que no se
              ven se mantienen ocultas para que la navegación por pestañas siga teniéndolas. */}
          {rol === 'empresa' ? (
            <TabTrigger name="calendario" href="/calendario" style={{ display: 'none' }} />
          ) : (
            <TabTrigger name="calendario" href="/calendario" asChild>
              <TabButton href="/calendario">{profe ? 'Seguimiento' : 'Calendario'}</TabButton>
            </TabTrigger>
          )}
          {rol === 'empresa' ? (
            <TabTrigger name="validaciones" href="/validaciones" asChild>
              <TabButton href="/validaciones">Validaciones</TabButton>
            </TabTrigger>
          ) : (
            <TabTrigger name="validaciones" href="/validaciones" style={{ display: 'none' }} />
          )}
          <TabTrigger name="chat" href="/chat" asChild>
            <TabButton href="/chat">Chat</TabButton>
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton href="/perfil">Perfil</TabButton>
          </TabTrigger>
          <BotonEsquema />
          {/* Como en anthropic.com: una sola acción destacada, en píldora oscura, al final. */}
          {rol === 'alumno' ? <BotonDestacado texto="Registrar hoy" href="/registro" /> : null}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/** Pantalla principal de cada pestaña: al pulsarla siempre se vuelve a ella. */
type RutaPestana = '/' | '/calendario' | '/validaciones' | '/chat' | '/perfil';

// `ref` se descarta: el tipo de expo-router/ui no encaja con el de Pressable en RN 0.88 y la navegación va por onPress.
export function TabButton({
  children,
  isFocused,
  ref: _ref,
  href,
  onPress,
  ...props
}: TabTriggerSlotProps & { href: RutaPestana }) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  return (
    <Pressable
      {...props}
      // Pulsar la pestaña lleva a su pantalla principal aunque estés dentro de una subparte
      // (ficha de un dossier, valoración de un mes, un hilo del chat): así se cierra la subparte.
      onPress={(evento) => {
        onPress?.(evento);
        router.replace(href);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      style={({ pressed }) => pressed && styles.pressed}>
      {({ hovered }: EstadoPressable) => (
        <View style={styles.tabButtonView}>
          <ThemedText
            type={isFocused ? 'smallBold' : 'small'}
            themeColor={isFocused || hovered ? 'text' : 'textSecondary'}
            style={transicionWeb(reducido, 'color')}>
            {children}
          </ThemedText>
          <View
            style={[
              styles.subrayado,
              transicionWeb(reducido, 'transform'),
              { backgroundColor: theme.primary },
              reducido
                ? { opacity: isFocused || hovered ? 1 : 0 }
                : { transform: [{ scaleX: isFocused || hovered ? 1 : 0 }] },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
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
        transicionWeb(reducido, 'background-color, border-color'),
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
          style={({ hovered, pressed }: EstadoPressable) => [
            pressed && styles.pressed,
            styles.logo,
            transicionWeb(reducido, 'width, background-color'),
            fondoHoverWeb(hovered, theme.subtle),
            { width: desplazado ? ANCHO_MARCA : ANCHO_LOGOTIPO },
          ]}>
          <View style={styles.zonaPalabra}>
            <View
              style={[
                styles.palabra,
                transicionWeb(reducido, 'transform, opacity'),
                {
                  opacity: desplazado ? 0 : 1,
                  transform: reducido
                    ? undefined
                    : [{ translateX: desplazado ? -ANCHO_PALABRA : 0 }],
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
  const reducido = useMovimientoReducido();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate(href)}
      style={({ hovered, pressed }: EstadoPressable) => [
        styles.destacado,
        transicionWeb(reducido, 'background-color, transform'),
        { backgroundColor: hovered ? theme.textHover : theme.text, opacity: pressed ? 0.8 : 1 },
        !reducido && { transform: [{ translateY: hovered ? -1 : 0 }] },
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.background }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function BotonEsquema() {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  const oscuro = useEsquemaWeb() === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onPress={() => cambiarEsquemaWeb(oscuro ? 'light' : 'dark')}
      style={({ hovered, pressed }: EstadoPressable) => [
        styles.botonEsquema,
        transicionWeb(reducido),
        { backgroundColor: hovered || pressed ? theme.subtle : 'transparent' },
      ]}>
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
  subrayado: {
    position: 'absolute',
    height: 2,
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.one,
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
