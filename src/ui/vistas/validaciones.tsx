import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { t, tPlural } from '@/ui/utils/idioma';
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
  const ancho = useWebAncha();
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
  const [enviando, setEnviando] = useState(false);
  const [informeAbierto, setInformeAbierto] = useState<string | null>(null);
  const [historiales, setHistoriales] = useState<ReadonlySet<string>>(new Set());
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

  async function aplicar(
    informes: InformePendiente[],
    valoracion: ValoracionMes,
    comentario: string,
  ) {
    if (enviando) return;
    setEnviando(true);
    try {
      const lista = await valorarEnBloque(
        container.valoraciones,
        usuario,
        informes,
        { valoracion, comentario },
        hoy,
      );
      setResultados(
        lista.map((r, i) => ({ ...r, alumnoNombre: informes[i].dossier.alumnoNombre })),
      );
      setMarcados(new Set(lista.filter((r) => !r.ok).map((r) => `${r.dossierId}|${r.mes}`)));
      setInformeAbierto(null);
      setRonda((r) => r + 1);
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  // Los alumnos con trabajo pendiente aparecen antes que los que ya están al día.
  const grupos = cargas
    .map((carga) => ({
      ...carga,
      pendientes: pendientes.filter((i) => i.dossier.id === carga.dossier.id),
      validadas: validadas.filter((i) => i.dossier.id === carga.dossier.id),
    }))
    .sort((a, b) => Number(b.pendientes.length > 0) - Number(a.pendientes.length > 0));

  return (
    <Pantalla
      titulo={t('Validaciones')}
      subtitulo={t('Los informes mensuales de tus alumnos')}
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {datos ? (
        <>
          <Tarjeta titulo={t('Resumen de validaciones')}>
            <ThemedText type="subtitle">
              {pendientes.length
                ? tPlural(
                    pendientes.length,
                    '{n} mes pendiente de validar',
                    '{n} meses pendientes de validar',
                  )
                : t('No tienes nada pendiente de validar')}
            </ThemedText>
            <View style={styles.chips}>
              <Chip
                texto={tPlural(
                  grupos.filter((g) => g.pendientes.length > 0).length,
                  '{n} alumno con pendientes',
                  '{n} alumnos con pendientes',
                )}
                color={pendientes.length ? 'estadoPendiente' : 'estadoValidado'}
              />
              <Chip
                texto={tPlural(validadas.length, '{n} mes validado', '{n} meses validados')}
                color="estadoValidado"
              />
            </View>
            {grupos
              .filter((g) => g.pendientes.length > 0)
              .map((g) => (
                <View key={g.dossier.id} style={styles.filaArriba}>
                  <ThemedText type="smallBold" style={styles.nombre}>
                    {g.dossier.alumnoNombre}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {tPlural(g.pendientes.length, '{n} mes pendiente', '{n} meses pendientes')}
                  </ThemedText>
                </View>
              ))}
            {pendientes.length > 0 ? (
              <Boton
                texto={t(todosMarcados ? 'Quitar la selección' : 'Seleccionar todos')}
                variante="secundario"
                desactivado={enviando}
                onPress={() => {
                  setInformeAbierto(null);
                  setMarcados(todosMarcados ? new Set() : new Set(pendientes.map(claveInforme)));
                }}
              />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t('Los nuevos meses aparecerán aquí cuando empiecen las prácticas.')}
              </ThemedText>
            )}
          </Tarjeta>
          {datos.length === 0 ? (
            <EstadoVacio
              titulo={t('No tienes alumnos asignados')}
              texto={t(
                'Cuando el centro te ponga como tutor de empresa de un alumno, aquí llegarán sus meses para validar.',
              )}
              accion={{ texto: t('Volver a mirar'), onPress: recargar }}
            />
          ) : null}
          {resultados ? (
            <ResultadoBloque resultados={resultados} onCerrar={() => setResultados(null)} />
          ) : null}
          {seleccionados.length > 0 ? (
            <ValoracionEnBloque
              key={`${ronda}|${seleccionados.map(claveInforme).join(',')}`}
              resumen={resumirBloque(seleccionados, registrosDe, hoy)}
              onConfirmar={(valoracion, comentario) =>
                aplicar(seleccionados, valoracion, comentario)
              }
            />
          ) : null}
          <View style={ancho ? styles.columnas : styles.listaAlumnos}>
            {grupos.map((grupo) => (
              <View key={grupo.dossier.id} style={ancho ? styles.columnaAlumno : undefined}>
                <Tarjeta titulo={t('Informes del alumno')}>
                  <View style={styles.filaArriba}>
                    <ThemedText type="subtitle" style={styles.nombre}>
                      {grupo.dossier.alumnoNombre}
                    </ThemedText>
                    <Chip
                      texto={
                        grupo.pendientes.length
                          ? tPlural(
                              grupo.pendientes.length,
                              '{n} mes pendiente',
                              '{n} meses pendientes',
                            )
                          : t('Al día')
                      }
                      color={grupo.pendientes.length ? 'estadoPendiente' : 'estadoValidado'}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[grupo.dossier.ciclo, grupo.dossier.centro, grupo.dossier.empresa]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('Tutor del centro: {nombre}', {
                      nombre: grupo.dossier.tutorNombre ?? t('sin asignar'),
                    })}
                  </ThemedText>
                  {grupo.pendientes.map((informe) => (
                    <View key={claveInforme(informe)} style={styles.lista}>
                      <FilaPendiente
                        informe={informe}
                        registros={grupo.registros}
                        marcada={marcados.has(claveInforme(informe))}
                        desactivada={enviando}
                        onMarcar={() => {
                          setInformeAbierto(null);
                          alternar(claveInforme(informe));
                        }}
                        onValidar={() => {
                          setMarcados(new Set());
                          setInformeAbierto(claveInforme(informe));
                        }}
                      />
                      {informeAbierto === claveInforme(informe) ? (
                        <ValoracionEnBloque
                          titulo={t('Valorar {mes}', { mes: nombreMes(informe.mes) })}
                          resumen={resumirBloque([informe], registrosDe, hoy)}
                          onCancelar={() => setInformeAbierto(null)}
                          onConfirmar={(valoracion, comentario) =>
                            aplicar([informe], valoracion, comentario)
                          }
                        />
                      ) : null}
                    </View>
                  ))}
                  {grupo.validadas.length > 0 ? (
                    <>
                      <Boton
                        texto={t(
                          historiales.has(grupo.dossier.id)
                            ? 'Ocultar meses validados ({n})'
                            : 'Ver meses validados ({n})',
                          { n: grupo.validadas.length },
                        )}
                        variante="secundario"
                        onPress={() =>
                          setHistoriales((actuales) => {
                            const nuevos = new Set(actuales);
                            if (!nuevos.delete(grupo.dossier.id)) nuevos.add(grupo.dossier.id);
                            return nuevos;
                          })
                        }
                      />
                      {historiales.has(grupo.dossier.id)
                        ? grupo.validadas.map(({ valoracion }) => (
                            <FilaValidada
                              key={valoracion.id}
                              dossier={grupo.dossier.alumnoNombre}
                              valoracion={valoracion}
                            />
                          ))
                        : null}
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t(
                        'Todavía no has validado ningún mes. Los que vayas cerrando aparecerán aquí.',
                      )}
                    </ThemedText>
                  )}
                </Tarjeta>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}

type ResultadoConNombre = ResultadoValoracionEnBloque & { alumnoNombre: string };

/** Una sola valoración para todo lo seleccionado; nada se guarda sin ver antes el resumen. */
function ValoracionEnBloque({
  resumen,
  titulo = t('Valorar la selección'),
  onCancelar,
  onConfirmar,
}: {
  titulo?: string;
  onCancelar?: () => void;
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
      setAviso(t('Elige la valoración'));
    } else if (faltaComentario) {
      setAviso(t('Explica qué tiene que mejorar el alumno'));
    } else {
      setAviso(null);
      setRevisando(true);
    }
  }

  async function confirmar() {
    if (!valoracion || enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      await onConfirmar(valoracion, comentario);
      setEnviando(false);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      setEnviando(false);
    }
  }

  return (
    <Tarjeta
      titulo={titulo}
      accion={
        onCancelar ? (
          <Boton
            texto={t('Cancelar')}
            variante="secundario"
            desactivado={enviando}
            onPress={onCancelar}
          />
        ) : undefined
      }>
      {revisando && valoracion ? (
        <>
          <ThemedText type="smallBold">{t('Revisa antes de confirmar')}</ThemedText>
          <ThemedText type="small">
            {tPlural(resumen.alumnos, '{n} alumno', '{n} alumnos')} ·{' '}
            {tPlural(resumen.informes, '{n} mes', '{n} meses')} · {formatoHoras(resumen.horas)}
          </ThemedText>
          <ThemedText type="small">
            {t('Valoración: {valoracion}', { valoracion: t(TEXTO_VALORACION[valoracion]) })}
          </ThemedText>
          <ThemedText type="small">
            {comentario.trim()
              ? t('Comentario: {comentario}', { comentario: comentario.trim() })
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
            opciones={VALORACIONES_MES.map((v) => ({ valor: v, texto: t(TEXTO_VALORACION[v]) }))}
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

function FilaPendiente({
  informe,
  registros,
  marcada,
  desactivada,
  onMarcar,
  onValidar,
}: {
  informe: InformePendiente;
  registros: RegistroDiario[];
  marcada: boolean;
  desactivada: boolean;
  onMarcar: () => void;
  onValidar: () => void;
}) {
  const theme = useTheme();
  const { dossier, mes } = informe;
  const { dias, horas } = resumenMes(registros, mes);
  return (
    <View style={[styles.pendiente, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.filaSeleccionable}>
        <CasillaTarea
          titulo={`${dossier.alumnoNombre}, ${nombreMes(mes)}`}
          hecha={marcada}
          desactivada={desactivada}
          textos={{
            marcada: t('seleccionado'),
            sinMarcar: t('sin seleccionar'),
            pista: t('Añade o quita este informe de la valoración en bloque'),
          }}
          onPress={onMarcar}
        />
        <ThemedText type="smallBold" style={styles.flex}>
          {nombreMes(mes)}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {dias
          ? t('Este mes: {horas} en {dias}', {
              horas: formatoHoras(horas),
              dias: tPlural(dias, '{n} día', '{n} días'),
            })
          : t('Todavía no ha apuntado días de este mes')}
      </ThemedText>
      <Boton
        texto={t('Validar')}
        desactivado={desactivada}
        accessibilityLabel={t('Validar el informe de {mes} de {nombre}', {
          mes: nombreMes(mes),
          nombre: dossier.alumnoNombre,
        })}
        onPress={onValidar}
      />
    </View>
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
      accessibilityLabel={`${dossier}, ${nombreMes(valoracion.mes)}: ${t(TEXTO_VALORACION[valoracion.valoracion]).toLowerCase()}${valoracion.comentario ? `, ${valoracion.comentario}` : ''}`}
      style={[styles.validada, { backgroundColor: theme.subtle, borderColor: theme.border }]}>
      <View style={styles.filaArriba}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.flex}>
          {dossier} · {nombreMes(valoracion.mes)}
        </ThemedText>
        <Chip
          texto={t(TEXTO_VALORACION[valoracion.valoracion])}
          color={COLOR_VALORACION[valoracion.valoracion]}
        />
      </View>
      {valoracion.comentario ? (
        <ThemedText type="small" themeColor="textSecondary">
          {valoracion.comentario}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t('Validado el {fecha}', { fecha: fechaCorta(valoracion.valoradaEn.slice(0, 10)) })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.four },
  columnaAlumno: { flexBasis: '48%', flexGrow: 1, minWidth: 0 },
  listaAlumnos: { gap: Spacing.four },
  nombre: { flexShrink: 1, minWidth: 0 },
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
  flex: { flex: 1, minWidth: 0 },
});
