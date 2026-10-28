import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import type { Rol } from '@/core/domain/usuario';
import { Colors } from '@/ui/theme/theme';

// Iconos de sistema: SF Symbols en iOS y Material Symbols en Android (expo-symbols ya viene con
// Expo, así que no hace falta ningún archivo ni dependencia nueva). El nombre de la pestaña es
// la etiqueta accesible; el icono solo acompaña.
export default function AppTabs({ rol }: { rol: Rol }) {
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

      <NativeTabs.Trigger name="registro" hidden={rol !== 'alumno'}>
        <NativeTabs.Trigger.Label>Registrar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.and.pencil" md="edit_square" />
      </NativeTabs.Trigger>

      {/* El instituto gestiona el suyo y la generalitat, el que elija: los dos ven la pestaña. */}
      <NativeTabs.Trigger name="centro" hidden={rol !== 'instituto' && rol !== 'generalitat'}>
        <NativeTabs.Trigger.Label>Centro</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'building.2', selected: 'building.2.fill' }}
          md="business"
        />
      </NativeTabs.Trigger>

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
