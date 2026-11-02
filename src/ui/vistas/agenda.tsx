import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { crearEvento, listarEventosMes } from '@/core/application/calendario';
import type { Dossier } from '@/core/domain/dossier';
import { TIPOS_EVENTO, type Evento, type TipoEvento } from '@/core/domain/evento';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { SelectorFecha } from '@/ui/components/selector-fecha';
import { Selector } from '@/ui/components/selector';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { sumarMeses } from '@/ui/utils/calendario';
import { leerFecha } from '@/ui/utils/fecha-escrita';
import { fechaCorta } from '@/ui/utils/fechas';

import { Cargando, ErrorCarga } from './comun';
import { t, tPlural } from '@/ui/utils/idioma';

export const TEXTO_TIPO_EVENTO: Record<TipoEvento, string> = {
  evento: 'Evento',
  entrega: 'Entrega',
  reunion: 'Reunión',
  festivo: 'Festivo',
  plazo: 'Plazo',
  curso: 'Curso',
};

/** Eventos del mes actual y del siguiente (generales y de los dossiers que ve el usuario). */
export async function eventosProximos(hoy: string): Promise<Evento[]> {
  const mes = hoy.slice(0, 7);
  const [este, siguiente] = await Promise.all([
    listarEventosMes(container.eventos, mes),
    listarEventosMes(container.eventos, sumarMeses(mes, 1)),
  ]);
  return [...este, ...siguiente]
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Próximas fechas: eventos generales y, si se pasa, solo los del dossier. */
export function ProximasFechas({
  hoy,
  dossierId,
  soloGenerales = false,
}: {
  hoy: string;
  dossierId?: string;
  /** Sin las fechas de cada dossier: las que ven todos los alumnos. */
  soloGenerales?: boolean;
}) {
  const { datos, error, recargar } = useDatos(() => eventosProximos(hoy), [hoy]);
  if (!datos) {
    return error ? (
      <ErrorCarga texto={error} onReintentar={recargar} />
    ) : (
      <Cargando texto={t('Cargando fechas…')} />
    );
  }
  const lista = datos.filter((e) =>
    soloGenerales
      ? e.dossierId === null
      : !dossierId || e.dossierId === null || e.dossierId === dossierId,
  );
  // La misma fecha puesta en varios dossiers se ve una sola vez, con cuántos alumnos la tienen.
  const grupos = new Map<string, { evento: Evento; alumnos: number }>();
  for (const e of lista) {
    const clave = JSON.stringify([e.fecha, e.titulo, e.tipo, e.dossierId === null]);
    const grupo = grupos.get(clave);
    if (grupo) grupo.alumnos += 1;
    else grupos.set(clave, { evento: e, alumnos: 1 });
  }
  if (lista.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {t('No hay fechas en las próximas semanas.')}
      </ThemedText>
    );
  }
  return (
    <View style={styles.lista}>
      {[...grupos.values()].map(({ evento: e, alumnos }) => (
        <View key={e.id} style={styles.fila}>
          <ThemedText type="smallBold" style={styles.fecha}>
            {fechaCorta(e.fecha)}
          </ThemedText>
          <View style={styles.texto}>
            <ThemedText type="small">{e.titulo}</ThemedText>
            <Chip
              texto={`${t(TEXTO_TIPO_EVENTO[e.tipo])}${
                e.dossierId
                  ? alumnos > 1
                    ? ` · ${tPlural(alumnos, '{n} alumno', '{n} alumnos')}`
                    : ''
                  : ` · ${t('general')}`
              }`}
              color={e.tipo === 'festivo' ? 'estadoFestivo' : 'textSecondary'}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Formulario para poner una fecha en el calendario. Con `dossier`, es solo de ese alumno
 * (su profe, instituto o generalitat); sin él, general para todos (instituto o generalitat).
 */
export function NuevoEvento({
  dossier,
  onCreado,
  tipos = [...TIPOS_EVENTO],
  tipoInicial,
}: {
  dossier?: Dossier;
  onCreado?: () => void;
  /** Tipos que se pueden elegir (la generalitat solo pone los de la red). */
  tipos?: TipoEvento[];
  tipoInicial?: TipoEvento;
}) {
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>(tipoInicial ?? (dossier ? 'entrega' : 'evento'));
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const leida = leerFecha(fecha);

  async function enviar() {
    if (leida.tipo !== 'ok') return;
    setAviso(null);
    setEnviando(true);
    try {
      await crearEvento(
        container.eventos,
        usuario,
        { dossierId: dossier?.id ?? null, titulo, fecha: leida.fecha, tipo },
        dossier,
      );
      setAviso({ tipo: 'ok', texto: `Añadido el ${fechaCorta(leida.fecha)}` });
      setTitulo('');
      setFecha('');
      setAbierto(false);
      onCreado?.();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  }

  // Plegado detrás de un botón para que la tarjeta no se haga eterna en el móvil.
  if (!abierto) {
    return (
      <View style={styles.lista}>
        {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
        <Boton
          texto={dossier ? t('+ Añadir una fecha') : t('+ Fecha para todos')}
          variante="secundario"
          onPress={() => {
            setAviso(null);
            setAbierto(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.lista}>
      <Campo
        etiqueta={dossier ? 'Nueva fecha para este alumno' : 'Nueva fecha para todos'}
        placeholder={t('Entrega de la memoria')}
        value={titulo}
        onChangeText={setTitulo}
      />
      <SelectorFecha etiqueta={t('Día')} valor={fecha} onCambio={setFecha} />
      {leida.tipo === 'error' ? (
        <ThemedText type="small" themeColor="danger">
          {leida.motivo}
        </ThemedText>
      ) : null}
      <Selector
        etiqueta={t('Tipo')}
        opciones={tipos.map((t) => ({ valor: t, texto: TEXTO_TIPO_EVENTO[t] }))}
        valor={tipo}
        onCambio={setTipo}
      />
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <Boton
        texto={t('Añadir al calendario')}
        onPress={enviar}
        cargando={enviando}
        desactivado={!titulo.trim() || leida.tipo !== 'ok'}
      />
      <Boton texto={t('Cancelar')} variante="secundario" onPress={() => setAbierto(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: Spacing.two },
  fila: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  fecha: { width: 88 },
  texto: { flex: 1, gap: Spacing.one },
});
