import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { guardarDatosPersonales, obtenerDatosPersonales } from '@/core/application/perfil';
import type { Idioma } from '@/core/domain/perfil';
import { container } from '@/config/container';
import { useSesion } from '@/ui/hooks/use-sesion';
import { esIdioma, fijarIdioma, idiomaDelDispositivo } from '@/ui/utils/idioma';

interface ContextoIdioma {
  idioma: Idioma;
  cambiarIdioma(idioma: Idioma): void;
}

const IdiomaContext = createContext<ContextoIdioma | null>(null);

const CLAVE = 'kampus.idioma';

// En la web se recuerda el último idioma elegido para la pantalla de entrada. Puede fallar
// (navegación privada, almacenamiento bloqueado): entonces se usa el del navegador.
function leerGuardado(): Idioma | null {
  if (Platform.OS !== 'web') return null;
  try {
    const valor = globalThis.localStorage?.getItem(CLAVE);
    return esIdioma(valor) ? valor : null;
  } catch {
    return null;
  }
}

function guardar(idioma: Idioma) {
  if (Platform.OS !== 'web') return;
  try {
    globalThis.localStorage?.setItem(CLAVE, idioma);
  } catch {
    // Solo es una comodidad: si no se puede guardar, no pasa nada.
  }
}

function inicial(): Idioma {
  const idioma = leerGuardado() ?? idiomaDelDispositivo();
  fijarIdioma(idioma);
  return idioma;
}

/**
 * Idioma de toda la app. Con sesión manda el que el usuario tiene guardado en su perfil; sin
 * sesión, el último elegido en este navegador o el del dispositivo. Si lo cambia en la pantalla de
 * entrada, al entrar se guarda en su perfil para que no se lo vuelva a cambiar. Al cambiarlo se vuelve a
 * pintar la app entera para que todos los textos (y las fechas) salgan en el idioma nuevo.
 */
export function IdiomaProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const [idioma, setIdioma] = useState<Idioma>(inicial);
  // Idioma que ha elegido a mano sin sesión (en la pantalla de entrada).
  const elegidoSinSesion = useRef<Idioma | null>(null);

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    fijarIdioma(nuevo);
    guardar(nuevo);
    setIdioma(nuevo);
  }, []);

  const elegir = useCallback(
    (nuevo: Idioma) => {
      if (!usuario) elegidoSinSesion.current = nuevo;
      cambiarIdioma(nuevo);
    },
    [usuario, cambiarIdioma],
  );

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    obtenerDatosPersonales(container.perfil)
      .then(async (datos) => {
        const elegido = elegidoSinSesion.current;
        elegidoSinSesion.current = null;
        if (elegido && elegido !== datos.idioma) {
          await guardarDatosPersonales(container.perfil, usuario, { ...datos, idioma: elegido });
          return;
        }
        if (vigente) cambiarIdioma(datos.idioma);
      })
      // Si no se puede leer el perfil se queda el idioma que ya había.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
    // Solo al entrar o cambiar de usuario, no al renombrarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, cambiarIdioma]);

  return (
    <IdiomaContext.Provider value={{ idioma, cambiarIdioma: elegir }}>
      <Remontar key={idioma}>{children}</Remontar>
    </IdiomaContext.Provider>
  );
}

function Remontar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useIdioma(): ContextoIdioma {
  const contexto = useContext(IdiomaContext);
  if (!contexto) throw new Error('useIdioma necesita IdiomaProvider');
  return contexto;
}
