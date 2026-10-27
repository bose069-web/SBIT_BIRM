import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type DependencyList } from 'react';

interface Resultado<T> {
  clave: string;
  datos: T | null;
  error: string | null;
}

/** Carga al enfocar la pantalla y descarta respuestas de consultas que ya no están vigentes. */
export function useDatos<T>(cargar: () => Promise<T>, deps: DependencyList) {
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify([...deps, version]);
  const [resultado, setResultado] = useState<Resultado<T>>({ clave: '', datos: null, error: null });

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      setResultado({ clave: '', datos: null, error: null });
      Promise.resolve()
        .then(cargar)
        .then((datos) => vigente && setResultado({ clave, datos, error: null }))
        .catch(
          (e: unknown) =>
            vigente &&
            setResultado({
              clave,
              datos: null,
              error: e instanceof Error ? e.message : String(e),
            }),
        );
      return () => {
        vigente = false;
      };
      // La clave incluye las dependencias de la consulta y la versión de recarga.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]),
  );

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  const vigente = resultado.clave === clave;
  return {
    datos: vigente ? resultado.datos : null,
    error: vigente ? resultado.error : null,
    cargando: !vigente,
    recargar,
  };
}
