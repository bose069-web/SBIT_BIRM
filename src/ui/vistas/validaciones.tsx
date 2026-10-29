import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import { obtenerSeguimiento } from '@/core/application/valoracion';
import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { container } from '@/config/container';
import { Chip } from '@/ui/components/chip';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, limitesMes, nombreMes } from '@/ui/utils/fechas';
import {
  informesPorValidar,
  valoracionesConAlumno,
  type CargaSeguimiento,
  type InformePendiente,
  type ValoracionConAlumno,
} from '@/ui/utils/validaciones';

import {
  COLOR_VALORACION,
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  TEXTO_VALORACION,
  porAlumno,
} from './comun';

/** Lo que necesita la pantalla de cada alumno: su seguimiento y los días que ha apuntado. */
interface CargaValidacion extends CargaSeguimiento {
  registros: RegistroDiario[];
}

/**
 * Pestaña Validaciones del tutor de empresa: arriba lo que le falta por validar (para ponerse
 * con ello) y abajo lo que ya ha validado, en un tono más flojo porque ya está hecho.
 */
export function VistaValidaciones() {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const todos = await listarDossiers(container.dossiers);
    const mios = porAlumno(todos.filter((d) => d.tutorEmpresaId === usuario.id));
    return Promise.all(
      mios.map(async (dossier): Promise<CargaValidacion> => {
        const [seguimiento, registros] = await Promise.all([
          obtenerSeguimiento(container.valoraciones, dossier, hoy),
          listarRegistros(container.registros, dossier.id, dossier.fechaInicio, dossier.fechaFin),
        ]);
        return { dossier, seguimiento, registros };
      }),
    );
  }, [usuario.id, hoy]);
  useRecargarAlVolver(recargar);

  const cargas = datos ?? [];
  const pendientes = informesPorValidar(cargas, hoy);
  const validadas = valoracionesConAlumno(cargas);

  const resumen = datos ? (
    <View style={styles.chips}>
      <Chip
        texto={pendientes.length ? `${pendientes.length} por validar` : 'Todo validado'}
        color={pendientes.length ? 'estadoPendiente' : 'estadoValidado'}
      />
      <Chip
        texto={`${validadas.length} ${validadas.length === 1 ? 'mes validado' : 'meses validados'}`}
        color="estadoValidado"
      />
    </View>
  ) : undefined;

  return (
    <Pantalla
      titulo="Validaciones"
      subtitulo="Los informes mensuales de tus alumnos"
      accion={resumen}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {datos && datos.length === 0 ? (
        <EstadoVacio
          titulo="No tienes alumnos asignados"
          texto="Cuando el centro te ponga como tutor de empresa de un alumno, aquí llegarán sus meses para validar."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}

      {datos && datos.length > 0 ? (
        <>
          <Tarjeta
            titulo="Por validar"
            accion={
              <Chip
                texto={pendientes.length ? `${pendientes.length}` : 'Nada'}
                color={pendientes.length ? 'estadoPendiente' : 'estadoValidado'}
              />
            }>
            {pendientes.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No te queda ningún informe pendiente. En cuanto tus alumnos empiecen un mes nuevo,
                aparecerá aquí para que lo valores.
              </ThemedText>
            ) : (
              <View style={styles.lista}>
                {pendientes.map((informe) => (
                  <FilaPendiente
                    key={`${informe.dossier.id}-${informe.mes}`}
                    informe={informe}
                    registros={
                      cargas.find((c) => c.dossier.id === informe.dossier.id)?.registros ?? []
                    }
                    onValidar={() => abrirValoracion(informe)}
                  />
                ))}
              </View>
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Ya validadas"
            accion={<Chip texto={validadas.length ? `${validadas.length}` : 'Ninguna'} />}>
            {validadas.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Todavía no has validado ningún mes. Los que vayas cerrando aparecerán aquí.
              </ThemedText>
            ) : (
              <View style={styles.lista}>
                {validadas.map(({ dossier, valoracion }) => (
                  <FilaValidada
                    key={valoracion.id}
                    dossier={dossier.alumnoNombre}
                    valoracion={valoracion}
                  />
                ))}
              </View>
            )}
          </Tarjeta>
        </>
      ) : null}
    </Pantalla>
  );
}

/** Validar es una subparte de Inicio: se abre allí con el dossier y el mes ya elegidos. */
function abrirValoracion({ dossier, mes }: InformePendiente) {
  router.push({ pathname: '/', params: { valorar: dossier.id, mes } });
}

function FilaPendiente({
  informe,
  registros,
  onValidar,
}: {
  informe: InformePendiente;
  registros: RegistroDiario[];
  onValidar: () => void;
}) {
  const theme = useTheme();
  const { dossier, mes } = informe;
  const [desde, hasta] = limitesMes(`${mes}-01`);
  const delMes = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
  const dias = delMes.filter((r) => r.tipo === 'trabajo').length;
  const horas = delMes.reduce((suma, r) => suma + totalHoras(r), 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Validar el informe de ${nombreMes(mes)} de ${dossier.alumnoNombre}`}
      onPress={onValidar}
      style={({ pressed }) => [
        styles.pendiente,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pulsada,
      ]}>
      <View style={styles.filaArriba}>
        <ThemedText type="smallBold" style={styles.flex}>
          {dossier.alumnoNombre} · {nombreMes(mes)}
        </ThemedText>
        <Chip texto="Pendiente" color="estadoPendiente" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {[dossier.ciclo, dossier.centro, dossier.empresa].filter(Boolean).join(' · ')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Tutor del centro: {dossier.tutorNombre ?? 'sin asignar'}
      </ThemedText>
      <View style={styles.filaArriba}>
        <ThemedText type="small" themeColor="textSecondary">
          {dias
            ? `Este mes: ${formatoHoras(horas)} en ${dias} ${dias === 1 ? 'día' : 'días'}`
            : 'Todavía no ha apuntado días de este mes'}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          Validar ›
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Un mes ya cerrado: mismo dato que el pendiente, pero apagado porque ya no hay nada que hacer. */
function FilaValidada({
  dossier,
  valoracion,
}: {
  dossier: string;
  valoracion: ValoracionConAlumno['valoracion'];
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${dossier}, ${nombreMes(valoracion.mes)}: ${TEXTO_VALORACION[
        valoracion.valoracion
      ].toLowerCase()}${valoracion.comentario ? `, ${valoracion.comentario}` : ''}`}
      style={[styles.validada, { backgroundColor: theme.subtle, borderColor: theme.border }]}>
      <View style={styles.filaArriba}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.flex}>
          {dossier} · {nombreMes(valoracion.mes)}
        </ThemedText>
        <Chip
          texto={TEXTO_VALORACION[valoracion.valoracion]}
          color={COLOR_VALORACION[valoracion.valoracion]}
        />
      </View>
      {valoracion.comentario ? (
        <ThemedText type="small" themeColor="textSecondary">
          {valoracion.comentario}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        Validado el {fechaCorta(valoracion.valoradaEn.slice(0, 10))}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  lista: { gap: Spacing.two },
  pendiente: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  validada: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filaArriba: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pulsada: { opacity: 0.6 },
  flex: { flex: 1 },
});
