import { useEffect, useState } from 'react';

import { useEsquemaWeb } from '@/ui/estado/preferencias-web';

/** En la web manda lo que elige la persona (claro por defecto), no el sistema. */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Patrón oficial de Expo para la hidratación en web: el render inicial debe coincidir con el estático.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  const esquema = useEsquemaWeb();
  const actual = hasHydrated ? esquema : 'light';
  // Que el navegador pinte también en ese modo sus partes (barras de scroll, campos, fondo).
  useEffect(() => {
    document.documentElement.style.colorScheme = actual;
  }, [actual]);
  return hasHydrated ? esquema : 'light';
}
