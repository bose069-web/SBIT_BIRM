import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { listarRegistros } from '@/core/application/registro-diario';
import { resumirHoras } from '@/core/domain/registro-diario';
import { gestionaDossier } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { BarraProgreso } from '@/ui/components/barra-progreso';
import { Boton } from '@/ui/components/boton';
import { Pantalla } from '@/ui/components/pantalla';
import { Quesito } from '@/ui/components/quesito';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras } from '@/ui/utils/fechas';
import { contarDias, horasPorActividad } from '@/ui/utils/horas-actividad';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';
import { SeccionHistorial } from './seccion-historial';
import { t, tPlural } from '@/ui/utils/idioma';

/** Ficha de solo lectura de un dossier: quién, dónde, cuándo y las horas de cada actividad. */
export function FichaDossier({
  dossierId,
  onVolver,
  onEditar = (id) => router.push({ pathname: '/', params: { editar: id } }),
}: {
  dossierId: string;
  onVolver: () => void;
  /** Por defecto, el formulario de Inicio; la gestión de alumnos lo abre en su propia pila. */
  onEditar?: (id: string) => void;
}) {
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
  useRecargarAlVolver(recargar);

  const volver = <Boton texto={t('‹ Volver')} variante="secundario" onPress={onVolver} />;

  if (!datos) {
    return (
      <Pantalla titulo={t('Ficha del dossier')}>
        {volver}
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoPanel tarjetas={3} /> : null}
        {!cargando && !error ? (
          <EstadoVacio
            titulo={t('No se encuentra el dossier')}
            texto={t('Puede que se haya borrado o que no tengas permiso para verlo.')}
          />
        ) : null}
      </Pantalla>
    );
  }

  const { dossier, resumen, actividades, dias } = datos;
  return (
    <Pantalla
      titulo={dossier.alumnoNombre}
      subtitulo={t('Ficha del dossier · {ciclo}', { ciclo: dossier.ciclo })}>
      {volver}
      {gestionaDossier(usuario, dossier) ? (
        <Boton
          texto={t('Editar dossier')}
          variante="secundario"
          onPress={() => onEditar(dossier.id)}
        />
      ) : null}

      <Tarjeta titulo={t('Prácticas')}>
        <Dato etiqueta={t('Ciclo')} valor={dossier.ciclo} />
        <Dato etiqueta={t('Centro')} valor={dossier.centro ?? 'Sin centro'} />
        <Dato etiqueta={t('Empresa')} valor={dossier.empresa ?? 'Sin empresa'} />
        <Dato etiqueta={t('Tutor del centro')} valor={dossier.tutorNombre ?? 'Sin asignar'} />
        <Dato
          etiqueta={t('Tutor de empresa')}
          valor={dossier.tutorEmpresaNombre ?? 'Sin asignar'}
        />
        <Dato
          etiqueta={t('Periodo')}
          valor={t('Del {inicio} al {fin}', {
            inicio: fechaCorta(dossier.fechaInicio),
            fin: fechaCorta(dossier.fechaFin),
          })}
        />
      </Tarjeta>

      <Tarjeta titulo={t('Horas')}>
        <View style={styles.quesito}>
          <Quesito porcentaje={resumen.porcentaje} etiqueta={t('Horas de prácticas completadas')} />
          <View style={styles.flex}>
            <View style={styles.horas}>
              <ThemedText type="title">{formatoHoras(resumen.realizadas)}</ThemedText>
              <ThemedText themeColor="textSecondary">de {formatoHoras(resumen.totales)}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {resumen.porcentaje}% completado ·{' '}
              {plural(dias.trabajo, 'día de trabajo', 'días de trabajo')}
              {dias.ausencia ? ` · ${plural(dias.ausencia, 'ausencia', 'ausencias')}` : ''}
              {dias.festivo ? ` · ${plural(dias.festivo, 'festivo', 'festivos')}` : ''}
            </ThemedText>
          </View>
        </View>
      </Tarjeta>

      <Tarjeta titulo={t('Actividades ({n})', { n: actividades.length })}>
        {actividades.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('Este dossier todavía no tiene actividades formativas.')}
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

      <SeccionHistorial dossier={dossier} />
    </Pantalla>
  );
}

const plural = (n: number, uno: string, varios: string) =>
  tPlural(n, `{n} ${uno}`, `{n} ${varios}`);

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
      accessibilityLabel={t('{actividad}: {horas}, {porcentaje}% de las horas', {
        actividad: descripcion,
        horas: formatoHoras(horas),
        porcentaje,
      })}>
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
  quesito: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  dato: { gap: Spacing.half },
  actividad: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaActividad: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
