import { Redirect } from 'expo-router';

// La pantalla la pinta el layout raíz; aquí solo se llega al volver a entrar tras restablecerla.
export default function Restablecer() {
  return <Redirect href="/" />;
}
