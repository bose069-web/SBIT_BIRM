import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listarDossiers, obtenerResumenHoras } from '@/core/application/dossier';
import { obtenerSeguimiento, ponerValoracionFinal } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import { RESULTADOS_FINALES, type ResultadoFinal } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';

import {
  Cargando,
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  TEXTO_RESULTADO,
} from './comun';

/** El profe sigue a todos los alumnos y pone la valoración final. */
export function PanelProfe() {
  const { datos, error, cargando, recargar } = useDatos(
    () => listarDossiers(container.dossiers),
    [],
  );
  useRecargarAlVolver(recargar);
  return (
    <Pantalla titulo="Seguimiento" subtitulo="Horas, valoraciones de la empresa y valoración final">
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel /> : null}
      {datos?.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay alumnos con dossier"
          texto="Cuando tus alumnos tengan su dossier de prácticas, aquí verás sus horas, las valoraciones de la empresa y podrás poner la valoración final."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos?.map((d) => (
        <SeguimientoDossier key={d.id} dossier={d} />
      ))}
    </Pantalla>
  );
}

function SeguimientoDossier({ dossier }: { dossier: Dossier }) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, recargar } = useDatos(async () => {
    const [resumen, seguimiento] = await Promise.all([
      obtenerResumenHoras(dossier, container.registros),
      obtenerSeguimiento(container.valoraciones, dossier, hoy),
    ]);
    return { resumen, seguimiento };
  }, [dossier.id, hoy]);
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!resultado) {
      setAviso({ tipo: 'error', texto: 'Elige apto o no apto' });
      return;
    }
    setAviso(null);
    setGuardando(true);
    try {
      await ponerValoracionFinal(container.valoraciones, usuario, dossier, {
        dossierId: dossier.id,
        resultado,
        comentario,
      });
      setAviso({ tipo: 'ok', texto: 'Valoración final guardada' });
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta titulo={`${dossier.ciclo} · ${dossier.empresa ?? 'Sin empresa'}`}>
      <ThemedText type="small" themeColor="textSecondary">
        Del {fechaCorta(dossier.fechaInicio)} al {fechaCorta(dossier.fechaFin)}
      </ThemedText>
      {!datos && error ? (
        <ErrorCarga texto={error} onReintentar={recargar} />
      ) : !datos ? (
        <Cargando texto="Cargando horas y valoraciones…" />
      ) : (
        <>
          <View style={styles.horas}>
            <ThemedText type="smallBold">
              {formatoHoras(datos.resumen.realizadas)} de {formatoHoras(datos.resumen.totales)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {datos.resumen.porcentaje}%
            </ThemedText>
          </View>
          <BarraProgreso porcentaje={datos.resumen.porcentaje} />
          {datos.seguimiento.sinValorar.length > 0 ? (
            <Chip
              texto={`La empresa no ha valorado: ${datos.seguimiento.sinValorar.map(nombreMes).join(', ')}`}
              color="estadoPendiente"
            />
          ) : null}
          <ListaValoraciones
            mensuales={datos.seguimiento.mensuales}
            final={datos.seguimiento.final}
          />

          <Selector
            etiqueta={datos.seguimiento.final ? 'Cambiar valoración final' : 'Valoración final'}
            opciones={RESULTADOS_FINALES.map((r) => ({ valor: r, texto: TEXTO_RESULTADO[r] }))}
            valor={resultado}
            onCambio={setResultado}
          />
          <Campo
            etiqueta="Comentario"
            multiline
            value={comentario}
            onChangeText={setComentario}
            ayuda="Obligatorio si no es apto. Cierra todos los meses del alumno."
          />
          {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
          <Boton texto="Guardar valoración final" onPress={guardar} cargando={guardando} />
        </>
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  horas: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
});
