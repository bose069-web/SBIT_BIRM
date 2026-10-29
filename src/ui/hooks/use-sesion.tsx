import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { cerrarSesion, iniciarSesion, obtenerUsuarioActual } from '@/core/application/auth';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  reintentar(): void;
  entrar(email: string, contrasena: string): Promise<void>;
  salir(): Promise<void>;
  /** Tras cambiar el nombre en el perfil, para que se vea en toda la app. */
  renombrar(nombre: string): void;
  /** Tras cambiar el correo en el perfil, para que se vea en toda la app. */
  cambiarCorreo(email: string): void;
}

const SesionContext = createContext<Sesion | null>(null);

/** Guarda quién ha iniciado sesión para toda la app. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const reintentar = useCallback(() => {
    setCargando(true);
    setError(null);
    setIntento((actual) => actual + 1);
  }, []);

  useEffect(() => {
    let vigente = true;
    obtenerUsuarioActual(container.auth)
      .then((actual) => {
        if (vigente) setUsuario(actual);
      })
      .catch(() => {
        if (vigente)
          setError('No se pudo recuperar la sesión. Comprueba la conexión y vuelve a intentarlo.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const entrar = useCallback(async (email: string, contrasena: string) => {
    setUsuario(await iniciarSesion(container.auth, email, contrasena));
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesion(container.auth);
    setUsuario(null);
  }, []);

  const renombrar = useCallback((nombre: string) => {
    setUsuario((actual) => (actual ? { ...actual, nombre } : actual));
  }, []);

  const cambiarCorreo = useCallback((email: string) => {
    setUsuario((actual) => (actual ? { ...actual, email } : actual));
  }, []);

  return (
    <SesionContext.Provider
      value={{ usuario, cargando, error, reintentar, entrar, salir, renombrar, cambiarCorreo }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error('useSesion necesita SesionProvider');
  return sesion;
}

/** Para pantallas que solo se ven con sesión iniciada. */
export function useUsuario(): Usuario {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('No hay sesión');
  return usuario;
}
