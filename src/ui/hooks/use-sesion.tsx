import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { cerrarSesion, iniciarSesion, obtenerUsuarioActual } from '@/core/application/auth';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  entrar(email: string, contrasena: string): Promise<void>;
  salir(): Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

/** Guarda quién ha iniciado sesión para toda la app. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerUsuarioActual(container.auth)
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  const entrar = useCallback(async (email: string, contrasena: string) => {
    setUsuario(await iniciarSesion(container.auth, email, contrasena));
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesion(container.auth);
    setUsuario(null);
  }, []);

  return (
    <SesionContext.Provider value={{ usuario, cargando, entrar, salir }}>
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
