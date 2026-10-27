import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useSesion, useUsuario } from '@/ui/hooks/use-sesion';

const NOMBRE_ROL = {
  alumno: 'Alumno',
  empresa: 'Tutor de empresa',
  profe: 'Tutor del centro',
  instituto: 'Instituto',
  generalitat: 'Generalitat',
} as const;

export default function PerfilScreen() {
  const usuario = useUsuario();
  const { salir } = useSesion();

  return (
    <Pantalla titulo="Perfil">
      <Tarjeta>
        <ThemedText type="subtitle">{usuario.nombre}</ThemedText>
        <ThemedText themeColor="textSecondary">{usuario.email}</ThemedText>
        <ThemedText type="smallBold">{NOMBRE_ROL[usuario.rol]}</ThemedText>
      </Tarjeta>
      <Tarjeta titulo="App">
        <ThemedText type="small" themeColor="textSecondary">
          Datos: {container.auth.nombre}
        </ThemedText>
      </Tarjeta>
      <Boton texto="Cerrar sesión" variante="peligro" onPress={salir} />
    </Pantalla>
  );
}
