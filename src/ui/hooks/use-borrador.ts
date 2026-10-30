import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { descartarBorrador, guardarBorrador, leerBorrador } from '@/core/application/borradores';
import type { ClaveBorrador } from '@/core/domain/borrador';
import { container } from '@/config/container';

/** Espera tras la última pulsación antes de escribir en el dispositivo. */
const ESPERA_MS = 600;

interface Opciones<T> {
  clave: ClaveBorrador;
  /** Lo que hay ahora en el formulario. */
  valores: T;
  /** Lo guardado: si el formulario coincide con esto, no hay borrador. */
  base: T;
  iguales: (a: T, b: T) => boolean;
  validar: (valores: unknown) => T | null;
  /** Con `false` se puede leer y descartar, pero el contenido no cambia. */
  guardable?: boolean;
  /** Se llama una vez si al abrir había un borrador distinto de lo guardado. */
  onRecuperar: (valores: T) => void;
}

/**
 * Autoguarda un formulario en el dispositivo y lo recupera al volver.
 * No guardar aquí datos personales sensibles: el almacén no va cifrado.
 */
export function useBorrador<T>({
  clave,
  valores,
  base,
  iguales,
  validar,
  guardable = true,
  onRecuperar,
}: Opciones<T>) {
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const claveTexto = JSON.stringify(clave);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistidos = useRef<T | null>(null);
  const leido = useRef(false);
  // Lo último que se ha pintado, para escribirlo aunque el formulario ya no esté montado.
  const actual = useRef({ clave, valores, base, iguales, validar, onRecuperar });
  useEffect(() => {
    actual.current = { clave, valores, base, iguales, validar, onRecuperar };
  });

  const escribir = useCallback(() => {
    temporizador.current = null;
    const { clave, valores, base, iguales } = actual.current;
    const hayCambios = !iguales(valores, base);
    if (hayCambios) {
      const instante = new Date().toISOString();
      persistidos.current = valores;
      return guardarBorrador(container.borradores, clave, { valores, guardadoEn: instante }).then(
        () => {
          setGuardadoEn(instante);
          setFallo(false);
        },
        () => {
          // Que no parezca guardado: se reintenta con el siguiente cambio.
          persistidos.current = null;
          setGuardadoEn(null);
          setFallo(true);
        },
      );
    }
    persistidos.current = null;
    setGuardadoEn(null);
    setFallo(false);
    return descartarBorrador(container.borradores, clave).catch(() => undefined);
  }, []);

  const pendienteEscribir = useCallback(() => {
    if (temporizador.current === null) return;
    clearTimeout(temporizador.current);
    void escribir();
  }, [escribir]);

  useEffect(() => {
    let vigente = true;
    leido.current = false;
    const { clave, base, iguales, validar, onRecuperar } = actual.current;
    void leerBorrador(container.borradores, clave, validar).then((borrador) => {
      if (!vigente) return;
      leido.current = true;
      if (!borrador) return;
      if (iguales(borrador.valores, base)) {
        void descartarBorrador(container.borradores, clave).catch(() => undefined);
        return;
      }
      persistidos.current = borrador.valores;
      setGuardadoEn(borrador.guardadoEn);
      onRecuperar(borrador.valores);
    });
    return () => {
      vigente = false;
    };
  }, [claveTexto]);

  const serie = JSON.stringify(valores);
  useEffect(() => {
    if (!leido.current || !guardable) return;
    const { valores, base, iguales } = actual.current;
    const yaPersistidos = persistidos.current;
    const sinCambios = iguales(valores, base)
      ? yaPersistidos === null
      : yaPersistidos !== null && iguales(valores, yaPersistidos);
    if (sinCambios) return;
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void escribir(), ESPERA_MS);
  }, [serie, guardable, escribir]);

  // Lo tecleado justo antes de salir o de recargar la página no se pierde.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.addEventListener('pagehide', pendienteEscribir);
    return () => window.removeEventListener('pagehide', pendienteEscribir);
  }, [pendienteEscribir]);
  useEffect(() => pendienteEscribir, [pendienteEscribir]);

  const descartar = useCallback(async () => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = null;
    persistidos.current = null;
    setGuardadoEn(null);
    setFallo(false);
    await descartarBorrador(container.borradores, actual.current.clave).catch(() => undefined);
  }, []);

  return { guardadoEn, fallo, descartar };
}
