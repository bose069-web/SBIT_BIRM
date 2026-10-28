import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { listarRegistros } from '@/core/application/registro-diario';
import { resumirHoras } from '@/core/domain/registro-diario';
import { gestionaDossier } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras } from '@/ui/utils/fechas';
import { contarDias, horasPorActividad } from '@/ui/utils/horas-actividad';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

/** Ficha de solo lectura de un dossier: quién, dónde, cuándo y las horas de cada actividad. */
export function FichaDossier({ dossierId, onVolver }: { dossierId: string; onVolver: () => void }) {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const dossier = await container.dossiers.obtener(dossierId);
    if (!dossier) return null;
    const registros = await listarRegistros(
      container.registros,
      dossier.id,
      dossier.fechaInicio,
      dossier.fechaFin,
    );
    return {
      dossier,
      resumen: resumirHoras(dossier, registros),
      actividades: horasPorActividad(dossier.actividades, registros),
      dias: contarDias(registros),
    };
  }, [dossierId]);

  const volver = <Boton texto="‹ Volver" variante="secundario" onPress={onVolver} />;

  if (!datos) {
    return (
      <Pantalla titulo="Ficha del dossier">
        {volver}
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoPanel tarjetas={3} /> : null}
        {!cargando && !error ? (
          <EstadoVacio
            titulo="No se encuentra el dossier"
            texto="Puede que se haya borrado o que no tengas permiso para verlo."
          />
        ) : null}
      </Pantalla>
    );
  }

  const { dossier, resumen, actividades, dias } = datos;
  return (
    <Pantalla titulo={dossier.alumnoNombre} subtitulo={`Ficha del dossier · ${dossier.ciclo}`}>
      {volver}
      {gestionaDossier(usuario, dossier) ? (
        <Boton
          texto="Editar dossier"
          variante="secundario"
          onPress={() => router.push({ pathname: '/', params: { editar: dossier.id } })}
        />
      ) : null}

      <Tarjeta titulo="Prácticas">
        <Dato etiqueta="Ciclo" valor={dossier.ciclo} />
        <Dato etiqueta="Centro" valor={dossier.centro ?? 'Sin centro'} />
        <Dato etiqueta="Empresa" valor={dossier.empresa ?? 'Sin empresa'} />
        <Dato etiqueta="Tutor del centro" valor={dossier.tutorNombre ?? 'Sin asignar'} />
        <Dato etiqueta="Tutor de empresa" valor={dossier.tutorEmpresaNombre ?? 'Sin asignar'} />
        <Dato
          etiqueta="Periodo"
          valor={`Del ${fechaCorta(dossier.fechaInicio)} al ${fechaCorta(dossier.fechaFin)}`}
        />
      </Tarjeta>

      <Tarjeta titulo="Horas">
        <View style={styles.horas}>
          <ThemedText type="title">{formatoHoras(resumen.realizadas)}</ThemedText>
          <ThemedText themeColor="textSecondary">de {formatoHoras(resumen.totales)}</ThemedText>
        </View>
        <BarraProgreso porcentaje={resumen.porcentaje} />
        <ThemedText type="small" themeColor="textSecondary">
          {resumen.porcentaje}% completado ·{' '}
          {plural(dias.trabajo, 'día de trabajo', 'días de trabajo')}
          {dias.ausencia ? ` · ${plural(dias.ausencia, 'ausencia', 'ausencias')}` : ''}
          {dias.festivo ? ` · ${plural(dias.festivo, 'festivo', 'festivos')}` : ''}
        </ThemedText>
      </Tarjeta>

      <Tarjeta titulo={`Actividades (${actividades.length})`}>
        {actividades.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Este dossier todavía no tiene actividades formativas.
          </ThemedText>
        ) : (
          actividades.map(({ actividad, horas, porcentaje }) => (
            <FilaActividad
              key={actividad.id}
              descripcion={actividad.descripcion}
              horas={horas}
              porcentaje={porcentaje}
            />
          ))
        )}
      </Tarjeta>
    </Pantalla>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText type="smallBold">{valor}</ThemedText>
    </View>
  );
}

function FilaActividad({
  descripcion,
  horas,
  porcentaje,
}: {
  descripcion: string;
  horas: number;
  porcentaje: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.actividad, { borderBottomColor: theme.border }]}
      accessible
      accessibilityLabel={`${descripcion}: ${formatoHoras(horas)}, ${porcentaje}% de las horas`}>
      <View style={styles.filaActividad}>
        <ThemedText type="small" style={styles.flex}>
          {descripcion}
        </ThemedText>
        <ThemedText type="smallBold">{formatoHoras(horas)}</ThemedText>
      </View>
      <BarraProgreso porcentaje={porcentaje} />
    </View>
  );
}

const styles = StyleSheet.create({
  horas: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  dato: { gap: Spacing.half },
  actividad: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaActividad: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
