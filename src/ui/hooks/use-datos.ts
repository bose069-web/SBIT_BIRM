import { useCallback, useEffect, useState, type DependencyList } from 'react';

interface Resultado<T> {
  clave: string;
  datos: T | null;
  error: string | null;
}

/** Carga datos asíncronos con estado de carga, error y una función para recargar. */
export function useDatos<T>(cargar: () => Promise<T>, deps: DependencyList) {
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify([...deps, version]);
  const [resultado, setResultado] = useState<Resultado<T>>({ clave: '', datos: null, error: null });

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => vigente && setResultado({ clave, datos, error: null }))
      .catch(
        (e: unknown) =>
          vigente &&
          setResultado((r) => ({
            clave,
            datos: r.datos,
            error: e instanceof Error ? e.message : String(e),
          })),
      );
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  // Mientras llega la nueva carga se siguen mostrando los datos anteriores.
  return {
    datos: resultado.datos,
    error: resultado.error,
    cargando: resultado.clave !== clave,
    recargar,
  };
}
