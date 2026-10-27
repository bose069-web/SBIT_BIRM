import { useState } from 'react';

import { listarDossiers } from '@/core/application/dossier';
import { obtenerSeguimiento, valorarMes } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import {
  mesDe,
  mesesDelDossier,
  VALORACIONES_MES,
  type ValoracionMes,
} from '@/core/domain/valoracion';
import { container } from '@/config/container';
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
import { fechaCorta, hoyISO, nombreMes } from '@/ui/utils/fechas';

import {
  CabeceraAlumno,
  Cargando,
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  TEXTO_VALORACION,
  estilosComunes,
  porAlumno,
} from './comun';

/** El tutor de empresa valora cada mes a sus alumnos. */
export function PanelEmpresa() {
  const { datos, error, cargando, recargar } = useDatos(
    () => listarDossiers(container.dossiers),
    [],
  );
  useRecargarAlVolver(recargar);
  return (
    <Pantalla titulo="Mis alumnos en prácticas" subtitulo="Valora cada mes el trabajo del alumno">
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel /> : null}
      {datos?.length === 0 ? (
        <EstadoVacio
          titulo="No tienes alumnos asignados"
          texto="Cuando el centro te ponga como tutor de empresa de un alumno, aparecerá aquí para que valores cada mes su trabajo."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos ? porAlumno(datos).map((d) => <ValorarDossier key={d.id} dossier={d} />) : null}
    </Pantalla>
  );
}

function ValorarDossier({ dossier }: { dossier: Dossier }) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, recargar } = useDatos(
    () => obtenerSeguimiento(container.valoraciones, dossier, hoy),
    [dossier.id, hoy],
  );
  const meses = mesesDelDossier(dossier).filter((m) => m <= mesDe(hoy));
  const [mes, setMes] = useState<string | null>(null);
  const [valoracion, setValoracion] = useState<ValoracionMes | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const mesElegido = mes ?? datos?.sinValorar[0] ?? meses[meses.length - 1] ?? null;

  async function guardar() {
    if (!mesElegido || !valoracion) {
      setAviso({ tipo: 'error', texto: 'Elige el mes y la valoración' });
      return;
    }
    setAviso(null);
    setGuardando(true);
    try {
      await valorarMes(
        container.valoraciones,
        usuario,
        dossier,
        {
          dossierId: dossier.id,
          mes: mesElegido,
          valoracion,
          comentario,
        },
        hoy,
      );
      setAviso({ tipo: 'ok', texto: `Valorado ${nombreMes(mesElegido)}` });
      setValoracion(null);
      setComentario('');
      setMes(null);
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta>
      <CabeceraAlumno
        nombre={dossier.alumnoNombre}
        detalle={[
          [dossier.ciclo, dossier.centro].filter(Boolean).join(' · '),
          `Tutor del centro: ${dossier.tutorNombre ?? 'sin asignar'}`,
          `Del ${fechaCorta(dossier.fechaInicio)} al ${fechaCorta(dossier.fechaFin)}`,
        ]}
      />
      {error && !datos ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {!datos && !error ? <Cargando texto="Cargando valoraciones…" /> : null}
      {datos && datos.sinValorar.length > 0 ? (
        <Chip
          texto={`Pendiente de valorar: ${datos.sinValorar.map(nombreMes).join(', ')}`}
          color="estadoPendiente"
        />
      ) : datos && meses.length > 0 && !datos.final ? (
        <Chip texto="Todos los meses acabados están valorados" color="estadoValidado" />
      ) : null}
      {!datos ? null : datos.final ? (
        <ThemedText type="small" themeColor="textSecondary">
          El profe ya ha puesto la valoración final: ya no se pueden cambiar los meses.
        </ThemedText>
      ) : meses.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Las prácticas empiezan el {fechaCorta(dossier.fechaInicio)}. Podrás valorar cuando empiece
          el primer mes.
        </ThemedText>
      ) : (
        <>
          <Selector
            etiqueta="Mes"
            opciones={meses.map((m) => ({ valor: m, texto: nombreMes(m) }))}
            valor={mesElegido}
            onCambio={setMes}
          />
          <Selector
            etiqueta="Valoración"
            opciones={VALORACIONES_MES.map((v) => ({ valor: v, texto: TEXTO_VALORACION[v] }))}
            valor={valoracion}
            onCambio={setValoracion}
          />
          <Campo
            etiqueta="Comentario"
            multiline
            value={comentario}
            onChangeText={setComentario}
            ayuda="Obligatorio si la valoración no es positiva. Al valorar, el mes se cierra para el alumno."
          />
          {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
          <Boton texto="Guardar valoración" onPress={guardar} cargando={guardando} />
        </>
      )}

      {datos ? (
        <>
          <ThemedText type="smallBold" style={estilosComunes.capital}>
            Historial
          </ThemedText>
          <ListaValoraciones mensuales={datos.mensuales} final={datos.final} />
        </>
      ) : null}
    </Tarjeta>
  );
}
