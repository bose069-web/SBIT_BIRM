import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import {
  obtenerSeguimiento,
  valorarEnBloque,
  type ResultadoValoracionEnBloque,
} from '@/core/application/valoracion';
import type { RegistroDiario } from '@/core/domain/registro-diario';
import { VALORACIONES_MES, type ValoracionMes } from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { CasillaTarea } from '@/ui/components/casilla-tarea';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, formatoHoras, hoyISO, nombreMes } from '@/ui/utils/fechas';
import {
  claveInforme,
  informesPorValidar,
  resumenMes,
  resumirBloque,
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
import { t, tPlural } from '@/ui/utils/idioma';

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
  const registrosDe = (dossierId: string) =>
    cargas.find((c) => c.dossier.id === dossierId)?.registros ?? [];

  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set());
  const [resultados, setResultados] = useState<ResultadoConNombre[] | null>(null);
  // Tras cada envío el formulario empieza de cero, aunque queden fallidos seleccionados.
  const [ronda, setRonda] = useState(0);
  // Solo cuenta lo que sigue pendiente: un mes que ya no lo está deja de estar seleccionado.
  const seleccionados = pendientes.filter((i) => marcados.has(claveInforme(i)));
  const todosMarcados = pendientes.length > 0 && seleccionados.length === pendientes.length;

  function alternar(clave: string) {
    setMarcados((actuales) => {
      const nuevos = new Set(actuales);
      if (!nuevos.delete(clave)) nuevos.add(clave);
      return nuevos;
    });
  }

  async function aplicar(valoracion: ValoracionMes, comentario: string) {
    const informes = seleccionados;
    const lista = await valorarEnBloque(
      container.valoraciones,
      usuario,
      informes,
      { valoracion, comentario },
      hoy,
    );
    setResultados(lista.map((r, i) => ({ ...r, alumnoNombre: informes[i].dossier.alumnoNombre })));
    // Se quedan marcados los que han fallado, para reintentarlos o revisarlos.
    setMarcados(new Set(lista.filter((r) => !r.ok).map((r) => `${r.dossierId}|${r.mes}`)));
    setRonda((r) => r + 1);
    recargar();
  }

  const resumen = datos ? (
    <View style={styles.chips}>
      <Chip
        texto={
          pendientes.length ? t('{n} por validar', { n: pendientes.length }) : t('Todo validado')
        }
        color={pendientes.length ? 'estadoPendiente' : 'estadoValidado'}
      />
      <Chip
        texto={tPlural(validadas.length, '{n} mes validado', '{n} meses validados')}
        color="estadoValidado"
      />
    </View>
  ) : undefined;

  return (
    <Pantalla
      titulo={t('Validaciones')}
      subtitulo={t('Los informes mensuales de tus alumnos')}
      accion={resumen}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {datos && datos.length === 0 ? (
        <EstadoVacio
          titulo={t('No tienes alumnos asignados')}
          texto={t(
            'Cuando el centro te ponga como tutor de empresa de un alumno, aquí llegarán sus meses para validar.',
          )}
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}

      {datos && datos.length > 0 ? (
        <>
          <Tarjeta
            titulo={t('Por validar')}
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
                <Boton
                  texto={todosMarcados ? 'Quitar la selección' : 'Seleccionar todos'}
                  variante="secundario"
                  onPress={() =>
                    setMarcados(todosMarcados ? new Set() : new Set(pendientes.map(claveInforme)))
                  }
                />
                {pendientes.map((informe) => (
                  <View key={claveInforme(informe)} style={styles.filaSeleccionable}>
                    <CasillaTarea
                      titulo={`${informe.dossier.alumnoNombre}, ${nombreMes(informe.mes)}`}
                      textos={TEXTOS_CASILLA}
                      hecha={marcados.has(claveInforme(informe))}
                      onPress={() => alternar(claveInforme(informe))}
                    />
                    <View style={styles.flex}>
                      <FilaPendiente
                        informe={informe}
                        registros={registrosDe(informe.dossier.id)}
                        onValidar={() => abrirValoracion(informe)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Tarjeta>

          {resultados ? (
            <ResultadoBloque resultados={resultados} onCerrar={() => setResultados(null)} />
          ) : null}
          {seleccionados.length > 0 ? (
            <ValoracionEnBloque
              key={ronda}
              resumen={resumirBloque(seleccionados, registrosDe, hoy)}
              onConfirmar={aplicar}
            />
          ) : null}

          <Tarjeta
            titulo={t('Ya validadas')}
            accion={<Chip texto={validadas.length ? `${validadas.length}` : 'Ninguna'} />}>
            {validadas.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('Todavía no has validado ningún mes. Los que vayas cerrando aparecerán aquí.')}
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

const TEXTOS_CASILLA = {
  marcada: 'seleccionado',
  sinMarcar: 'sin seleccionar',
  pista: 'Añade o quita este informe de la valoración en bloque',
};

type ResultadoConNombre = ResultadoValoracionEnBloque & { alumnoNombre: string };

/** Una sola valoración para todo lo seleccionado; nada se guarda sin ver antes el resumen. */
function ValoracionEnBloque({
  resumen,
  onConfirmar,
}: {
  resumen: ReturnType<typeof resumirBloque>;
  onConfirmar: (valoracion: ValoracionMes, comentario: string) => Promise<void>;
}) {
  const [valoracion, setValoracion] = useState<ValoracionMes | null>(null);
  const [comentario, setComentario] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const faltaComentario = valoracion !== 'positiva' && !comentario.trim();

  function revisar() {
    if (!valoracion) {
      setAviso('Elige la valoración');
    } else if (faltaComentario) {
      setAviso('Explica qué tiene que mejorar el alumno');
    } else {
      setAviso(null);
      setRevisando(true);
    }
  }

  async function confirmar() {
    if (!valoracion) return;
    setEnviando(true);
    setAviso(null);
    try {
      await onConfirmar(valoracion, comentario);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      setEnviando(false);
    }
  }

  return (
    <Tarjeta titulo={t('Valorar la selección')}>
      {revisando && valoracion ? (
        <>
          <ThemedText type="smallBold">{t('Revisa antes de confirmar')}</ThemedText>
          <ThemedText type="small">
            {resumen.alumnos} {resumen.alumnos === 1 ? 'alumno' : 'alumnos'} · {resumen.informes}{' '}
            {resumen.informes === 1 ? 'mes' : 'meses'} · {formatoHoras(resumen.horas)}
          </ThemedText>
          <ThemedText type="small">Valoración: {TEXTO_VALORACION[valoracion]}</ThemedText>
          <ThemedText type="small">
            {comentario.trim()
              ? t('Comentario: {texto}', { texto: comentario.trim() })
              : t('Sin comentario')}
          </ThemedText>
          {resumen.sinDias > 0 ? (
            <ThemedText type="smallBold" themeColor="estadoPendiente">
              {tPlural(
                resumen.sinDias,
                '{n} informe no tiene ningún día de trabajo apuntado.',
                '{n} informes no tienen ningún día de trabajo apuntado.',
              )}
            </ThemedText>
          ) : null}
          {resumen.delMesEnCurso > 0 ? (
            <ThemedText type="smallBold" themeColor="estadoPendiente">
              {t('Incluye el mes en curso: el alumno ya no podrá apuntar más días de ese mes.')}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('Cada alumno verá esta valoración y este comentario, y su mes se cerrará.')}
          </ThemedText>
          {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
          <Boton texto={t('Confirmar valoración')} onPress={confirmar} cargando={enviando} />
          <Boton
            texto={t('Volver')}
            variante="secundario"
            desactivado={enviando}
            onPress={() => setRevisando(false)}
          />
        </>
      ) : (
        <>
          <Selector
            etiqueta={t('Valoración')}
            opciones={VALORACIONES_MES.map((v) => ({ valor: v, texto: TEXTO_VALORACION[v] }))}
            valor={valoracion}
            onCambio={setValoracion}
          />
          <Campo
            etiqueta={t('Comentario')}
            multiline
            value={comentario}
            onChangeText={setComentario}
            ayuda={t(
              'Opcional si la valoración es positiva; si no, hay que explicar qué mejorar. Es el mismo para todos.',
            )}
          />
          {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
          <Boton texto={t('Revisar y confirmar')} onPress={revisar} />
        </>
      )}
    </Tarjeta>
  );
}

function ResultadoBloque({
  resultados,
  onCerrar,
}: {
  resultados: ResultadoConNombre[];
  onCerrar: () => void;
}) {
  const hechos = resultados.filter((r) => r.ok);
  const fallidos = resultados.filter((r) => !r.ok);
  return (
    <Tarjeta titulo={t('Resultado de la valoración')}>
      {hechos.length > 0 ? (
        <>
          <Mensaje
            tipo="ok"
            texto={tPlural(hechos.length, '{n} mes valorado', '{n} meses valorados')}
          />
          {hechos.map((r) => (
            <ThemedText key={`${r.dossierId}|${r.mes}`} type="small">
              {r.alumnoNombre} · {nombreMes(r.mes)}
            </ThemedText>
          ))}
        </>
      ) : null}
      {fallidos.length > 0 ? (
        <>
          <Mensaje
            tipo="error"
            texto={tPlural(
              fallidos.length,
              '{n} requiere atención. Los que siguen pendientes quedan seleccionados.',
              '{n} requieren atención. Los que siguen pendientes quedan seleccionados.',
            )}
          />
          {fallidos.map((r) => (
            <ThemedText key={`${r.dossierId}|${r.mes}`} type="small">
              {r.alumnoNombre} · {nombreMes(r.mes)}: {r.ok ? '' : r.motivo}
            </ThemedText>
          ))}
        </>
      ) : null}
      <Boton texto={t('Cerrar')} variante="secundario" onPress={onCerrar} />
    </Tarjeta>
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
  const { dias, horas } = resumenMes(registros, mes);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Validar el informe de {mes} de {nombre}', {
        mes: nombreMes(mes),
        nombre: dossier.alumnoNombre,
      })}
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
        <Chip texto={t('Pendiente')} color="estadoPendiente" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {[dossier.ciclo, dossier.centro, dossier.empresa].filter(Boolean).join(' · ')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('Tutor del centro: {nombre}', { nombre: dossier.tutorNombre ?? t('sin asignar') })}
      </ThemedText>
      <View style={styles.filaArriba}>
        <ThemedText type="small" themeColor="textSecondary">
          {dias
            ? `${t('Este mes: {horas} en', { horas: formatoHoras(horas) })} ${tPlural(dias, '{n} día', '{n} días')}`
            : 'Todavía no ha apuntado días de este mes'}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          {t('Validar ›')}
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
  filaSeleccionable: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
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
