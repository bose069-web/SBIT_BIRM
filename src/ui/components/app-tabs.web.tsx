import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import type { Rol } from '@/core/domain/usuario';

import { useTheme } from '@/ui/hooks/use-theme';
import { MaxContentWidth, Radius, Spacing } from '@/ui/theme/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type NombreIcono = 'inicio' | 'registrar' | 'centro' | 'perfil';

// Mismo trazo de 24 para los cuatro iconos: coherentes entre sí y con los del móvil
// (casa, cuaderno con lápiz, edificio y persona).
const TRAZOS: Record<NombreIcono, ReactNode> = {
  inicio: (
    <>
      <path d="M4 10.8 12 4l8 6.8" />
      <path d="M6.2 9.6V20h11.6V9.6" />
      <path d="M10.2 20v-5.2h3.6V20" />
    </>
  ),
  registrar: (
    <>
      <path d="M14.5 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20h10.4a1.8 1.8 0 0 0 1.8-1.8V8.5z" />
      <path d="M14.5 4v4.5H19" />
      <path d="M12 11.5v5M9.5 14h5" />
    </>
  ),
  centro: (
    <>
      <path d="M4.5 20V7.8L12 4l7.5 3.8V20" />
      <path d="M3 20h18" />
      <path d="M9 10.5h1.2M13.8 10.5H15M9 14h1.2M13.8 14H15" />
      <path d="M10.5 20v-3.2h3V20" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5.4 20c0-3.4 2.9-5.6 6.6-5.6s6.6 2.2 6.6 5.6" />
    </>
  ),
};

export default function AppTabs({ rol }: { rol: Rol }) {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icono="inicio">Inicio</TabButton>
          </TabTrigger>
          {/* La ruta existe para todos (si no, no se puede navegar a ella); solo el alumno ve la pestaña. */}
          {rol === 'alumno' ? (
            <TabTrigger name="registro" href="/registro" asChild>
              <TabButton icono="registrar">Registrar día</TabButton>
            </TabTrigger>
          ) : (
            <TabTrigger name="registro" href="/registro" style={{ display: 'none' }} />
          )}
          {/* El instituto gestiona el suyo y la generalitat, el que elija: los dos ven la pestaña. */}
          {rol === 'instituto' || rol === 'generalitat' ? (
            <TabTrigger name="centro" href="/centro" asChild>
              <TabButton icono="centro">Centro</TabButton>
            </TabTrigger>
          ) : (
            <TabTrigger name="centro" href="/centro" style={{ display: 'none' }} />
          )}
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton icono="perfil">Perfil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/** Icono decorativo: la etiqueta de la pestaña es el nombre accesible. */
function IconoPestana({ nombre, color }: { nombre: NombreIcono; color: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {TRAZOS[nombre]}
    </svg>
  );
}

// `ref` se descarta: el tipo de expo-router/ui no encaja con el de Pressable en RN 0.88 y la navegación va por onPress.
export function TabButton({
  children,
  isFocused,
  icono,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { icono?: NombreIcono }) {
  const theme = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={isFocused ? 'subtle' : 'surface'} style={styles.tabButtonView}>
        <View style={styles.contenido}>
          {icono ? (
            <IconoPestana nombre={icono} color={isFocused ? theme.text : theme.textSecondary} />
          ) : null}
          <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
            {children}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} accessibilityRole="tablist" style={styles.tabListContainer}>
      <ThemedView type="surface" style={[styles.innerContainer, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Kampus
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
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
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
