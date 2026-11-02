import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type DependencyList } from 'react';

interface Resultado<T> {
  clave: string;
  /** Las dependencias sin la versión de recarga: qué se está consultando. */
  consulta: string;
  datos: T | null;
  error: string | null;
}

/** Carga al enfocar la pantalla y descarta respuestas de consultas que ya no están vigentes. */
export function useDatos<T>(cargar: () => Promise<T>, deps: DependencyList) {
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify([...deps, version]);
  const consulta = JSON.stringify(deps);
  const [resultado, setResultado] = useState<Resultado<T>>({
    clave: '',
    consulta: '',
    datos: null,
    error: null,
  });

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      Promise.resolve()
        .then(cargar)
        .then((datos) => vigente && setResultado({ clave, consulta, datos, error: null }))
        .catch(
          (e: unknown) =>
            vigente &&
            setResultado({
              clave,
              consulta,
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
  // Al recargar la misma consulta se mantiene lo que hay en pantalla: así no se pierde el scroll.
  const misma = resultado.consulta === consulta;
  return {
    datos: misma ? resultado.datos : null,
    error: misma ? resultado.error : null,
    cargando: resultado.clave !== clave,
    recargar,
  };
}
