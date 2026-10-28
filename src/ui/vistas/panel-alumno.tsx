import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { obtenerDossierActual, obtenerResumenHoras } from '@/core/application/dossier';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { mesCerrado, mesDe } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';

import { TareasDossier } from './tareas';
import {
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  estilosComunes,
} from './comun';

export function PanelAlumno() {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await obtenerDossierActual(container.dossiers, hoy);
    if (!dossier) return null;
    const [resumen, seguimiento] = await Promise.all([
      obtenerResumenHoras(dossier, container.registros),
      obtenerSeguimiento(container.valoraciones, dossier, hoy),
    ]);
    return { dossier, resumen, seguimiento };
  }, [hoy]);
  useRecargarAlVolver(recargar);

  return (
    <Pantalla titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} subtitulo={fechaCorta(hoy)}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {!cargando && !datos && !error ? (
        <EstadoVacio
          titulo="Todavía no tienes prácticas asignadas"
          texto="Cuando tu tutor del centro cree tu dossier de prácticas, aquí verás tus horas, el calendario y las valoraciones de la empresa."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos ? (
        <>
          <Tarjeta titulo="Horas de prácticas">
            <View style={styles.horas}>
              <ThemedText type="title">{formatoHoras(datos.resumen.realizadas)}</ThemedText>
              <ThemedText themeColor="textSecondary">
                de {formatoHoras(datos.resumen.totales)}
              </ThemedText>
            </View>
            <BarraProgreso porcentaje={datos.resumen.porcentaje} />
            <ThemedText type="small" themeColor="textSecondary">
              {datos.resumen.porcentaje}% completado
            </ThemedText>
          </Tarjeta>

          <Tarjeta titulo="Este mes">
            <View style={estilosComunes.fila}>
              <ThemedText type="smallBold" style={estilosComunes.capital}>
                {nombreMes(mesDe(hoy))}
              </ThemedText>
              {mesCerrado(hoy, datos.seguimiento.mensuales, datos.seguimiento.final) ? (
                <Chip texto="Cerrado: ya valorado" color="estadoFestivo" />
              ) : (
                <Chip texto="Abierto" color="estadoValidado" />
              )}
            </View>
            <Boton texto="Registrar el día de hoy" onPress={() => router.push('/registro')} />
          </Tarjeta>

          <Tarjeta titulo="Tareas">
            <TareasDossier dossier={datos.dossier} />
          </Tarjeta>

          <Tarjeta titulo="Mis prácticas">
            <ThemedText type="smallBold">
              {datos.dossier.ciclo} · {datos.dossier.empresa ?? 'Sin empresa'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {datos.dossier.centro ?? 'Sin centro'} · del {fechaCorta(datos.dossier.fechaInicio)}{' '}
              al {fechaCorta(datos.dossier.fechaFin)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tutor del centro: {datos.dossier.tutorNombre ?? 'sin asignar'}
              {'\n'}Tutor de empresa: {datos.dossier.tutorEmpresaNombre ?? 'sin asignar'}
            </ThemedText>
            <Boton
              texto="Ver la ficha completa"
              variante="secundario"
              onPress={() => router.push({ pathname: '/', params: { dossier: datos.dossier.id } })}
            />
          </Tarjeta>

          <Tarjeta titulo="Valoraciones de la empresa">
            <ListaValoraciones
              mensuales={datos.seguimiento.mensuales}
              final={datos.seguimiento.final}
            />
          </Tarjeta>
        </>
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  horas: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
});
