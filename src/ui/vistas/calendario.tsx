import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { agendaDelMes, listarEventosMes } from '@/core/application/calendario';
import { obtenerDossierActual } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import { listarTareas } from '@/core/application/tareas';
import { obtenerSeguimiento, type Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { mesCerrado, mesDe } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { Aparecer } from '@/ui/components/aparecer';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { estadoDia } from '@/ui/utils/calendario';
import { fechaLarga, formatoHoras, hoyISO, limitesMes } from '@/ui/utils/fechas';

import { NuevoEvento, ProximasFechas } from './agenda';
import { CalendarioMes, ESTADOS_DIA } from './calendario-mes';
import { ErrorCarga, EsqueletoPanel, EstadoVacio, estilosComunes } from './comun';

/** Pestaña Calendario: el alumno ve su mes con lo apuntado; los demás, las fechas que les tocan. */
export function VistaCalendario() {
  const { rol } = useUsuario();
  const hoy = hoyISO();
  if (rol === 'alumno') return <CalendarioDelAlumno hoy={hoy} />;
  const ponFechas = rol === 'instituto' || rol === 'generalitat';
  return (
    <Pantalla titulo="Calendario" subtitulo="Entregas, reuniones y festivos">
      <Tarjeta titulo="Próximas fechas">
        <ProximasFechas hoy={hoy} />
      </Tarjeta>
      {ponFechas ? (
        <Tarjeta titulo="Fechas para todos">
          <ThemedText type="small" themeColor="textSecondary">
            Festivos, entregas o reuniones generales: los ven todos los alumnos en su calendario.
          </ThemedText>
          <NuevoEvento />
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}

function CalendarioDelAlumno({ hoy }: { hoy: string }) {
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await obtenerDossierActual(container.dossiers, hoy);
    if (!dossier) return null;
    const seguimiento = await obtenerSeguimiento(container.valoraciones, dossier, hoy);
    return { dossier, seguimiento };
  }, [hoy]);
  useRecargarAlVolver(recargar);

  return (
    <Pantalla titulo="Calendario" subtitulo="Toca un día para ver qué hay y registrarlo">
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {!cargando && !datos && !error ? (
        <EstadoVacio
          titulo="Todavía no tienes prácticas asignadas"
          texto="Cuando tu tutor cree tu dossier, aquí verás tu calendario de prácticas."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos ? (
        <>
          <Tarjeta titulo="Mis días">
            <CalendarioAlumno dossier={datos.dossier} seguimiento={datos.seguimiento} hoy={hoy} />
          </Tarjeta>
          <Tarjeta titulo="Próximas fechas">
            <ProximasFechas hoy={hoy} dossierId={datos.dossier.id} />
          </Tarjeta>
        </>
      ) : null}
    </Pantalla>
  );
}

/** Mes a mes, con lo apuntado cada día. Tocar un día abre su registro. */
export function CalendarioAlumno({
  dossier,
  seguimiento,
  hoy,
}: {
  dossier: Dossier;
  seguimiento: Seguimiento;
  hoy: string;
}) {
  // Empieza en el mes de hoy, o en el más cercano del periodo de prácticas.
  const [mes, setMes] = useState(() => {
    const actual = mesDe(hoy);
    if (actual < mesDe(dossier.fechaInicio)) return mesDe(dossier.fechaInicio);
    if (actual > mesDe(dossier.fechaFin)) return mesDe(dossier.fechaFin);
    return actual;
  });
  const [elegida, setElegida] = useState(hoy);
  const [desde, hasta] = limitesMes(`${mes}-01`);
  const {
    datos: mesDatos,
    error,
    recargar,
  } = useDatos(async () => {
    const [registros, eventos, tareas] = await Promise.all([
      listarRegistros(container.registros, dossier.id, desde, hasta),
      listarEventosMes(container.eventos, mes),
      listarTareas(container.tareas, dossier.id),
    ]);
    // Qué hay cada día: eventos generales y del dossier, y tareas pendientes que vencen.
    const agenda = new Map<string, string[]>();
    const delDossier = eventos.filter((e) => e.dossierId === null || e.dossierId === dossier.id);
    const pendientes = tareas.filter((t) => !t.completada);
    for (const [fecha, dia] of agendaDelMes(mes, delDossier, pendientes)) {
      agenda.set(fecha, [
        ...dia.eventos.map((e) => e.titulo),
        ...dia.tareas.map((t) => `Entrega: ${t.titulo}`),
      ]);
    }
    return { registros, agenda };
  }, [dossier.id, desde, hasta, mes]);
  useRecargarAlVolver(recargar);
  const cerrado = mesCerrado(`${mes}-01`, seguimiento.mensuales, seguimiento.final);

  return (
    <>
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <CalendarioMes
        mes={mes}
        onCambiarMes={setMes}
        dias={mesDatos?.registros ?? []}
        agenda={mesDatos?.agenda}
        periodo={dossier}
        hoy={hoy}
        cerrado={cerrado}
        seleccionada={elegida}
        onElegir={setElegida}
      />
      {mesDe(elegida) === mes ? (
        <DiaElegido
          fecha={elegida}
          registro={mesDatos?.registros.find((r) => r.fecha === elegida)}
          agenda={mesDatos?.agenda.get(elegida) ?? []}
          periodo={dossier}
          hoy={hoy}
          cerrado={cerrado}
        />
      ) : null}
    </>
  );
}

/** Qué hay el día elegido y botón para abrir su registro. */
function DiaElegido({
  fecha,
  registro,
  agenda,
  periodo,
  hoy,
  cerrado,
}: {
  fecha: string;
  registro?: RegistroDiario;
  agenda: string[];
  periodo: Dossier;
  hoy: string;
  cerrado: boolean;
}) {
  const estado = estadoDia(fecha, registro, periodo, hoy);
  const info = ESTADOS_DIA[estado];
  const enPeriodo = estado !== 'fuera';
  const futuro = fecha > hoy;
  return (
    <Aparecer key={fecha} style={styles.dia}>
      <View style={estilosComunes.fila}>
        <ThemedText type="smallBold">
          {fechaLarga(fecha).replace(/^./, (l) => l.toUpperCase())}
        </ThemedText>
        {info.color ? <Chip texto={info.texto} color={info.color} /> : null}
      </View>
      {registro && estado === 'trabajo' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {formatoHoras(totalHoras(registro))} apuntadas
        </ThemedText>
      ) : null}
      {agenda.map((a) => (
        <ThemedText key={a} type="small">
          • {a}
        </ThemedText>
      ))}
      {enPeriodo && !futuro ? (
        <Boton
          texto={
            cerrado ? 'Ver el registro' : registro ? 'Editar el registro' : 'Registrar este día'
          }
          variante={registro || cerrado ? 'secundario' : 'primario'}
          onPress={() => router.push({ pathname: '/registro', params: { fecha } })}
        />
      ) : null}
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  dia: { gap: Spacing.two },
});
