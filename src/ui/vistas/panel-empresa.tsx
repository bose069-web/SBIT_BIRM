import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { listarDossiers } from '@/core/application/dossier';
import { listarRegistros } from '@/core/application/registro-diario';
import { obtenerSeguimiento, valorarMes, type Seguimiento } from '@/core/application/valoracion';
import type { Dossier } from '@/core/domain/dossier';
import {
  resumirHoras,
  totalHoras,
  type RegistroDiario,
  type ResumenHoras,
} from '@/core/domain/registro-diario';
import {
  mesDe,
  mesesDelDossier,
  VALORACIONES_MES,
  type ValoracionMes,
} from '@/core/domain/valoracion';
import { container } from '@/config/container';
import { AnilloProgreso } from '@/ui/components/anillo-progreso';
import { Avatar } from '@/ui/components/avatar';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Cifra } from '@/ui/components/cifra';
import { Leyenda } from '@/ui/components/leyenda';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useChat } from '@/ui/estado/chat-empresa';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { FontFamily, Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import {
  conversacionesDe,
  hace,
  mensajesDe,
  noLeidos,
  porRecientes,
  type Conversacion,
  type MensajeChat,
} from '@/ui/utils/chat';
import {
  diasHasta,
  fechaCorta,
  formatoHoras,
  hoyISO,
  limitesMes,
  nombreMes,
} from '@/ui/utils/fechas';
import { avisosAlumno, calcularRitmo, type EstadoRitmo, type Ritmo } from '@/ui/utils/ritmo';
import {
  informesPorValidar,
  mesesPorValidar,
  valoracionesConAlumno,
  type InformePendiente,
} from '@/ui/utils/validaciones';

import {
  CabeceraAlumno,
  Cargando,
  ErrorCarga,
  EsqueletoPanel,
  EstadoVacio,
  ListaValoraciones,
  COLOR_VALORACION,
  TEXTO_VALORACION,
  estilosComunes,
  porAlumno,
} from './comun';

interface CargaDossier {
  dossier: Dossier;
  seguimiento: Seguimiento;
  resumen: ResumenHoras;
  /** Último día de trabajo apuntado por el alumno, para ver si va al día. */
  ultimoDia: RegistroDiario | null;
}

/**
 * Inicio de la empresa: primero lo que tiene que validar; después las cifras, a quién conviene
 * mirar, cómo va cada alumno frente a su calendario, las fechas, los mensajes y lo último valorado.
 */
export function PanelEmpresa({
  validar = null,
  mes = null,
}: {
  /** Dossier y mes que se están valorando (`?valorar=<id>&mes=<AAAA-MM>`). */
  validar?: string | null;
  mes?: string | null;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const hoy = hoyISO();
  const ancho = useWebAncha();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const todos = await listarDossiers(container.dossiers);
    const mios = porAlumno(todos.filter((d) => d.tutorEmpresaId === usuario.id));
    // Son pocos dossiers (los que tutela esta persona): se piden sus días y su seguimiento.
    return Promise.all(
      mios.map(async (dossier): Promise<CargaDossier> => {
        const [seguimiento, registros] = await Promise.all([
          obtenerSeguimiento(container.valoraciones, dossier, hoy),
          listarRegistros(container.registros, dossier.id, dossier.fechaInicio, dossier.fechaFin),
        ]);
        const ultimoDia = registros
          .filter((r) => r.tipo === 'trabajo')
          .reduce<RegistroDiario | null>(
            (ultimo, r) => (!ultimo || r.fecha > ultimo.fecha ? r : ultimo),
            null,
          );
        return { dossier, seguimiento, resumen: resumirHoras(dossier, registros), ultimoDia };
      }),
    );
  }, [usuario.id, hoy]);
  useRecargarAlVolver(recargar);
  const { mensajes, leidoHasta } = useChat(usuario);

  // Valorar es una subparte de Inicio: se sale de ella volviendo a la pantalla principal.
  if (validar) {
    const elegido = datos?.find((d) => d.dossier.id === validar);
    if (!elegido) {
      return (
        <Pantalla titulo="Valorar el mes" subtitulo="Informes de prácticas">
          <Boton
            texto="‹ Volver a Inicio"
            variante="secundario"
            onPress={() => router.replace('/')}
          />
          {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
          {cargando ? <EsqueletoPanel tarjetas={1} /> : null}
          {!cargando && !error ? (
            <EstadoVacio
              titulo="No se encuentra el alumno"
              texto="Puede que ya no esté en prácticas contigo. Vuelve a Inicio para ver los que tienes."
            />
          ) : null}
        </Pantalla>
      );
    }
    return (
      <Pantalla
        titulo={`Valorar a ${elegido.dossier.alumnoNombre}`}
        subtitulo="Cierra cada mes con tu valoración del trabajo del alumno"
        amplia={ancho}>
        <ValorarDossier
          dossier={elegido.dossier}
          mesInicial={mes}
          onTerminar={() => router.replace('/')}
        />
        {/* Abajo también, para salir sin tener que subir hasta la cabecera. */}
        <Boton
          texto="‹ Volver a Inicio"
          variante="secundario"
          onPress={() => router.replace('/')}
        />
      </Pantalla>
    );
  }

  const informes = informesPorValidar(datos ?? [], hoy);
  const ultimas = valoracionesConAlumno(datos ?? []).slice(0, 4);
  const conversaciones = porRecientes(
    conversacionesDe(
      (datos ?? []).map((d) => d.dossier),
      usuario.id,
    ),
    mensajes,
  );
  const sinLeer = conversaciones.reduce(
    (total, c) => total + noLeidos(mensajes, c.id, leidoHasta[c.id] ?? null, usuario.id),
    0,
  );
  // Cada alumno con su ritmo (lo que debería llevar hoy) y, si hay algo que mirar, sus avisos.
  const ritmos = (datos ?? []).map((carga) => ({
    ...carga,
    ritmo: calcularRitmo(carga.dossier, carga.resumen.realizadas, hoy),
  }));
  const atencion = ritmos
    .map((carga) => ({
      ...carga,
      avisos: avisosAlumno(
        carga.dossier,
        carga.resumen.realizadas,
        carga.ultimoDia?.fecha ?? null,
        hoy,
      ),
    }))
    .filter((carga) => carga.avisos.length > 0)
    .sort(
      (a, b) =>
        b.avisos.length - a.avisos.length ||
        a.dossier.alumnoNombre.localeCompare(b.dossier.alumnoNombre, 'es'),
    );

  const alRitmo = ritmos.filter((carga) => carga.ritmo.estado === 'al_dia').length;
  const finDeMes = limitesMes(hoy)[1];
  const tarjetaAncha = ancho ? styles.tarjetaAncha : undefined;

  // Cada bloque se define una vez: la web y el móvil solo cambian cómo se ordenan.
  const porValidar = (
    <Tarjeta
      style={{
        ...tarjetaAncha,
        ...(informes.length ? { borderColor: theme.primary } : null),
      }}>
      {informes.length === 0 ? (
        <View style={styles.filaCentrada}>
          <Correcto />
          <View style={styles.flex}>
            <ThemedText type="subtitle">Todo validado</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Todos los meses abiertos están valorados.
            </ThemedText>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.filaCentrada}>
            <ThemedText style={styles.cifraGrande} accessibilityRole="header">
              {informes.length}
            </ThemedText>
            <View style={styles.flex}>
              <ThemedText type="subtitle">
                {informes.length === 1 ? 'Informe por validar' : 'Informes por validar'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Lo primero de hoy. El mes en curso cierra el {fechaCorta(finDeMes)}.
              </ThemedText>
            </View>
          </View>
          <View style={styles.lista}>
            {informes.map((i) => (
              <FilaInforme
                key={`${i.dossier.id}-${i.mes}`}
                informe={i}
                onValidar={() => abrirValoracion(i.dossier.id, i.mes)}
              />
            ))}
          </View>
        </>
      )}
    </Tarjeta>
  );

  const cifras = (
    <View style={styles.cifras}>
      <Cifra
        valor={`${ritmos.length}`}
        etiqueta={ritmos.length === 1 ? 'Alumno' : 'Alumnos'}
        detalle="en prácticas"
      />
      <Cifra
        valor={`${alRitmo}`}
        etiqueta="Al ritmo"
        detalle={`de ${ritmos.length}`}
        color={alRitmo ? 'estadoValidado' : 'text'}
      />
      <Cifra
        valor={`${atencion.length}`}
        etiqueta="Con avisos"
        detalle="para revisar"
        color={atencion.length ? 'estadoPendiente' : 'text'}
      />
      <Cifra
        valor={`${sinLeer}`}
        etiqueta="Sin leer"
        detalle="mensajes"
        color={sinLeer ? 'primary' : 'text'}
      />
    </View>
  );

  const necesitanAtencion = (
    <Tarjeta titulo="Necesitan atención" style={tarjetaAncha}>
      {atencion.length === 0 ? (
        <View style={styles.filaCentrada}>
          <Correcto />
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            Todos apuntan sus días y van al ritmo del calendario.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.lista}>
          {atencion.map(({ dossier, avisos }) => (
            <Pressable
              key={dossier.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver la ficha de ${dossier.alumnoNombre}: ${avisos.join('. ')}`}
              onPress={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
              style={({ pressed }) => [styles.filaPersona, pressed && styles.pulsada]}>
              <Avatar nombre={dossier.alumnoNombre} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{dossier.alumnoNombre}</ThemedText>
                {avisos.map((aviso) => (
                  <ThemedText key={aviso} type="small" themeColor="textSecondary">
                    {aviso}
                  </ThemedText>
                ))}
              </View>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </Tarjeta>
  );

  const alumnos = (
    <Tarjeta titulo="Tus alumnos" style={tarjetaAncha}>
      <View style={styles.rejilla}>
        {[...ritmos]
          .sort((a, b) => a.ritmo.desviacion - b.ritmo.desviacion)
          .map((carga) => (
            <TarjetaAlumno
              key={carga.dossier.id}
              carga={carga}
              hoy={hoy}
              onValorar={() => abrirValoracion(carga.dossier.id, null)}
            />
          ))}
      </View>
      <Leyenda
        elementos={[
          { texto: 'Horas hechas', color: 'primary' },
          { texto: 'Marca: lo que debería llevar hoy', color: 'text', forma: 'cuadrado' },
        ]}
      />
    </Tarjeta>
  );

  const fechas = (
    <Tarjeta titulo="Fechas" style={tarjetaAncha}>
      <Fechas datos={datos ?? []} hoy={hoy} pendientes={informes.length} />
    </Tarjeta>
  );

  const bandeja = (
    <Tarjeta
      titulo="Mensajes"
      style={tarjetaAncha}
      accion={<Enlace texto="Abrir chat ›" onPress={() => router.navigate('/chat')} />}>
      <Inbox
        conversaciones={conversaciones}
        mensajes={mensajes}
        leidoHasta={leidoHasta}
        usuarioId={usuario.id}
      />
    </Tarjeta>
  );

  const valoraciones = (
    <Tarjeta titulo="Últimas valoraciones" style={tarjetaAncha}>
      {ultimas.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no has valorado ningún mes de estos alumnos.
        </ThemedText>
      ) : (
        <View style={styles.rejilla}>
          {ultimas.map(({ dossier, valoracion }) => (
            <View key={valoracion.id} style={[styles.azulejo, { borderColor: theme.border }]}>
              <View style={styles.filaCentrada}>
                <Avatar nombre={dossier.alumnoNombre} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{dossier.alumnoNombre}</ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={estilosComunes.capital}>
                    {nombreMes(valoracion.mes)}
                  </ThemedText>
                </View>
              </View>
              <Chip
                texto={TEXTO_VALORACION[valoracion.valoracion]}
                color={COLOR_VALORACION[valoracion.valoracion]}
              />
              {valoracion.comentario ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
                  {valoracion.comentario}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                Valorado el {fechaCorta(valoracion.valoradaEn.slice(0, 10))}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </Tarjeta>
  );

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={fechaCorta(hoy)}
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {datos && datos.length === 0 && !cargando ? (
        <EstadoVacio
          titulo="No tienes alumnos asignados"
          texto="Cuando el centro te ponga como tutor de empresa de un alumno, aquí llegarán sus informes para validar y podrás hablar con él y con su profe."
          accion={{ texto: 'Volver a mirar', onPress: recargar }}
        />
      ) : null}
      {datos && datos.length > 0 ? (
        ancho ? (
          <View style={styles.columnas}>
            <View style={styles.principal}>
              {porValidar}
              {alumnos}
              {valoraciones}
            </View>
            <View style={styles.lateral}>
              {cifras}
              {necesitanAtencion}
              {fechas}
              {bandeja}
            </View>
          </View>
        ) : (
          <View style={styles.bloques}>
            {porValidar}
            {cifras}
            {necesitanAtencion}
            {alumnos}
            {bandeja}
            {fechas}
            {valoraciones}
          </View>
        )
      ) : null}
    </Pantalla>
  );
}

/** Valorar una subparte de Inicio lleva a la misma ruta con su parámetro. */
function abrirValoracion(dossierId: string, mes: string | null) {
  router.push({
    pathname: '/',
    params: mes ? { valorar: dossierId, mes } : { valorar: dossierId },
  });
}

/** Marca de "todo en orden" para los estados sin pendientes. */
function Correcto() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.correcto, { backgroundColor: theme.subtle }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke={theme.estadoValidado}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function FilaInforme({ informe, onValidar }: { informe: InformePendiente; onValidar: () => void }) {
  const theme = useTheme();
  const { dossier, mes } = informe;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Validar el informe de ${nombreMes(mes)} de ${dossier.alumnoNombre}`}
      onPress={onValidar}
      style={({ pressed }) => [
        styles.filaPersona,
        styles.filaInforme,
        { backgroundColor: theme.subtle },
        pressed && styles.pulsada,
      ]}>
      <Avatar nombre={dossier.alumnoNombre} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {dossier.alumnoNombre}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={estilosComunes.capital}>
          {nombreMes(mes)}
        </ThemedText>
      </View>
      <View style={[styles.pastilla, { backgroundColor: theme.primary }]}>
        <ThemedText type="smallBold" themeColor="onPrimary">
          Valorar
        </ThemedText>
      </View>
    </Pressable>
  );
}

const TEXTO_ESTADO_RITMO: Record<EstadoRitmo, string> = {
  al_dia: 'Al ritmo',
  por_debajo: 'Por debajo',
  sin_empezar: 'Sin empezar',
  terminadas: 'Terminadas',
};

const COLOR_ESTADO_RITMO: Record<EstadoRitmo, ThemeColor> = {
  al_dia: 'estadoValidado',
  por_debajo: 'estadoPendiente',
  sin_empezar: 'textSecondary',
  terminadas: 'textSecondary',
};

/** Cómo va el alumno frente a su calendario y qué hay que hacer con él. */
function TarjetaAlumno({
  carga,
  hoy,
  onValorar,
}: {
  carga: CargaDossier & { ritmo: Ritmo };
  hoy: string;
  onValorar: () => void;
}) {
  const theme = useTheme();
  const { dossier, seguimiento, resumen, ultimoDia, ritmo } = carga;
  const pendientes = mesesPorValidar(dossier, seguimiento, hoy).length;
  return (
    <View style={[styles.azulejo, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Ver la ficha del dossier de ${dossier.alumnoNombre}`}
        onPress={() => router.push({ pathname: '/', params: { dossier: dossier.id } })}
        style={({ pressed }) => [styles.filaCentrada, styles.tactil, pressed && styles.pulsada]}>
        <Avatar nombre={dossier.alumnoNombre} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {dossier.alumnoNombre}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[dossier.ciclo, dossier.centro].filter(Boolean).join(' · ') || 'Ver ficha'}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </Pressable>
      <View style={styles.filaCentrada}>
        <AnilloProgreso
          porcentaje={resumen.porcentaje}
          marca={ritmo.porcentajeEsperado}
          etiqueta={`Horas de ${dossier.alumnoNombre}`}
        />
        <View style={[styles.flex, styles.datosAlumno]}>
          <View style={styles.horas}>
            <ThemedText type="subtitle">{formatoHoras(resumen.realizadas)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              de {formatoHoras(resumen.totales)}
            </ThemedText>
          </View>
          <Chip texto={TEXTO_ESTADO_RITMO[ritmo.estado]} color={COLOR_ESTADO_RITMO[ritmo.estado]} />
        </View>
      </View>
      <View>
        <ThemedText type="small" themeColor="textSecondary">
          {detalleRitmo(ritmo, resumen, dossier)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {ultimoDia
            ? `Último día: ${fechaCorta(ultimoDia.fecha)} · ${formatoHoras(totalHoras(ultimoDia))}`
            : 'Todavía no ha apuntado ningún día'}
        </ThemedText>
      </View>
      <View style={styles.filaArriba}>
        {pendientes ? (
          <Chip texto={`${pendientes} por validar`} color="estadoPendiente" />
        ) : (
          <Chip texto="Todo validado" color="estadoValidado" />
        )}
        <Enlace texto="Valorar meses ›" onPress={onValorar} />
      </View>
    </View>
  );
}

/** Lo que debería llevar hoy, o cómo acabó si ya terminó, para dar sentido a las horas. */
function detalleRitmo(ritmo: Ritmo, resumen: ResumenHoras, dossier: Dossier): string {
  if (ritmo.estado === 'sin_empezar') return `Empieza el ${fechaCorta(dossier.fechaInicio)}`;
  if (ritmo.estado === 'terminadas') {
    return `Acabó con ${formatoHoras(resumen.realizadas)} de ${formatoHoras(resumen.totales)}`;
  }
  const deberia = `Debería llevar ${formatoHoras(ritmo.esperadas)}`;
  if (Math.abs(ritmo.desviacion) < 0.5) return `${deberia} · justo al ritmo`;
  return `${deberia} · ${formatoHoras(Math.abs(ritmo.desviacion))} ${
    ritmo.desviacion > 0 ? 'por delante' : 'por debajo'
  }`;
}

/** Cuenta atrás: los días que faltan como dato principal de la fila. */
function CuentaAtras({ dias }: { dias: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.cuenta, { backgroundColor: theme.subtle }]}>
      {dias < 0 ? (
        <ThemedText type="smallBold">Fin</ThemedText>
      ) : (
        <>
          <ThemedText type="smallBold">{dias}</ThemedText>
          <ThemedText style={styles.cuentaUnidad} themeColor="textSecondary">
            {dias === 1 ? 'día' : 'días'}
          </ThemedText>
        </>
      )}
    </View>
  );
}

/** Lo que queda de prácticas de cada alumno y cuándo cierra el mes en curso. */
function Fechas({
  datos,
  hoy,
  pendientes,
}: {
  datos: CargaDossier[];
  hoy: string;
  pendientes: number;
}) {
  const finDeMes = limitesMes(hoy)[1];
  return (
    <View style={styles.lista}>
      <View style={styles.filaCentrada}>
        <CuentaAtras dias={diasHasta(finDeMes, hoy)} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">Cierre del mes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {fechaCorta(finDeMes)} · {pendientes ? `${pendientes} sin validar` : 'todo validado'}
          </ThemedText>
        </View>
      </View>
      {[...datos]
        .sort((a, b) => a.dossier.fechaFin.localeCompare(b.dossier.fechaFin))
        .map(({ dossier }) => (
          <View key={dossier.id} style={styles.filaCentrada}>
            <CuentaAtras dias={diasHasta(dossier.fechaFin, hoy)} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {dossier.alumnoNombre}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Termina el {fechaCorta(dossier.fechaFin)}
              </ThemedText>
            </View>
          </View>
        ))}
    </View>
  );
}

function Inbox({
  conversaciones,
  mensajes,
  leidoHasta,
  usuarioId,
}: {
  conversaciones: Conversacion[];
  mensajes: MensajeChat[];
  leidoHasta: Record<string, string>;
  usuarioId: string;
}) {
  const theme = useTheme();
  const ultimos = conversaciones
    .flatMap((conversacion) => {
      const delHilo = mensajesDe(mensajes, conversacion.id);
      const ultimo = delHilo[delHilo.length - 1];
      return ultimo ? [{ conversacion, mensaje: ultimo }] : [];
    })
    .sort((a, b) => b.mensaje.enviadoEn.localeCompare(a.mensaje.enviadoEn))
    .slice(0, 4);

  if (ultimos.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Todavía no hay mensajes de tus alumnos ni de sus profes.
      </ThemedText>
    );
  }

  return (
    <View style={styles.lista}>
      {ultimos.map(({ conversacion, mensaje }) => {
        const nuevos = noLeidos(
          mensajes,
          conversacion.id,
          leidoHasta[conversacion.id] ?? null,
          usuarioId,
        );
        return (
          <Pressable
            key={`${conversacion.id}-${mensaje.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Abrir el chat con ${conversacion.titulo}${
              nuevos ? `, ${nuevos} sin leer` : ''
            }`}
            onPress={() =>
              router.push({ pathname: '/chat', params: { conversacion: conversacion.id } })
            }
            style={({ pressed }) => [styles.filaPersona, pressed && styles.pulsada]}>
            <Avatar nombre={conversacion.titulo} />
            <View style={styles.flex}>
              <View style={styles.filaCentrada}>
                <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                  {conversacion.titulo}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {hace(mensaje.enviadoEn)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {mensaje.autorId === usuarioId ? 'Tú: ' : ''}
                {mensaje.texto}
              </ThemedText>
            </View>
            {nuevos ? (
              <View style={[styles.contador, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" themeColor="onPrimary">
                  {nuevos}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.enlace, pressed && styles.pulsada]}>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Valoración de los meses de un alumno, con su historial. */
function ValorarDossier({
  dossier,
  mesInicial,
  onTerminar,
}: {
  dossier: Dossier;
  mesInicial: string | null;
  onTerminar: () => void;
}) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const { datos, error, recargar } = useDatos(
    () => obtenerSeguimiento(container.valoraciones, dossier, hoy),
    [dossier.id, hoy],
  );
  const meses = mesesDelDossier(dossier).filter((m) => m <= mesDe(hoy));
  const [mes, setMes] = useState<string | null>(mesInicial);
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
      onTerminar();
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

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  principal: { flex: 1.7, gap: Spacing.four },
  lateral: { flex: 1, gap: Spacing.four },
  // En el móvil, más aire entre bloques que dentro de ellos.
  bloques: { gap: Spacing.four },
  tarjetaAncha: { padding: Spacing.four },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cifraGrande: { fontFamily: FontFamily.semibold, fontSize: 52, lineHeight: 60, letterSpacing: -1 },
  lista: { gap: Spacing.two },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  azulejo: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 280,
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.button,
  },
  filaCentrada: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  filaPersona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.one,
    borderRadius: Radius.button,
  },
  filaInforme: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tactil: { minHeight: 44 },
  pastilla: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  correcto: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  datosAlumno: { gap: Spacing.two, alignItems: 'flex-start' },
  horas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Spacing.one },
  cuenta: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
  },
  cuentaUnidad: { fontSize: 12, lineHeight: 14 },
  contador: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
  },
  filaArriba: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  // 44 pt de zona táctil sin que el texto ocupe más alto en la cabecera de la tarjeta.
  enlace: { minHeight: 44, justifyContent: 'center', marginVertical: -Spacing.two },
  pulsada: { opacity: 0.6 },
  flex: { flex: 1 },
});
