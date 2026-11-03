import { useEffect } from 'react';
import { Appearance, useColorScheme as useEsquemaSistema } from 'react-native';

import { useEsquemaElegido } from '@/ui/estado/preferencias-web';

/** En el móvil sigue al sistema hasta que la persona elige en su perfil. */
export function useColorScheme() {
  const sistema = useEsquemaSistema();
  const elegido = useEsquemaElegido();
  // También lo cambia en lo que pinta el propio sistema, como las pestañas nativas.
  useEffect(() => {
    if (elegido) Appearance.setColorScheme(elegido);
  }, [elegido]);
  return elegido ?? sistema;
}
