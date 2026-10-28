import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from '@/ui/hooks/use-color-scheme';

import type { Rol } from '@/core/domain/usuario';
import { Colors } from '@/ui/theme/theme';

// Iconos de sistema: SF Symbols en iOS y Material Symbols en Android (expo-symbols ya viene con
// Expo, así que no hace falta ningún archivo ni dependencia nueva). El nombre de la pestaña es
// la etiqueta accesible; el icono solo acompaña.
export default function AppTabs({ rol }: { rol: Rol }) {
  // El profe no usa calendario: en esa pestaña tiene el seguimiento de su clase.
  const profe = rol === 'profe';
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.subtle}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendario">
        <NativeTabs.Trigger.Label>{profe ? 'Seguimiento' : 'Calendario'}</NativeTabs.Trigger.Label>
        {profe ? (
          <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
        ) : (
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
          md="forum"
        />
      </NativeTabs.Trigger>

      {/* Registrar y Centro siguen siendo rutas, pero se abren desde Inicio, no desde la barra. */}
      <NativeTabs.Trigger name="registro" hidden />
      <NativeTabs.Trigger name="centro" hidden />

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
