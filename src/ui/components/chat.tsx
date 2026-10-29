import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputKeyPressEvent,
} from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO, sumarDias } from '@/ui/utils/fechas';

// Piezas del chat: avatar, burbujas agrupadas con separadores de día y el campo para escribir.

/** Un mensaje tal y como lo pinta el chat (sirve para mensajes y para la descripción inicial). */
export interface MensajeChat {
  id: string;
  autorId: string;
  autorNombre: string | null;
  texto: string;
  /** Fecha y hora ISO. */
  creadoEn: string;
}

/** Dos mensajes seguidos del mismo autor con menos de 5 minutos van en el mismo grupo. */
const MINUTOS_GRUPO = 5;

export function iniciales(nombre: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const [primera, segunda] = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ''];
  return (primera[0] + (segunda[0] ?? '')).toUpperCase();
}

/** Fecha local `AAAA-MM-DD` de una fecha y hora ISO. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function horaCorta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «Hoy», «Ayer» o la fecha corta. */
export function nombreDia(iso: string): string {
  const dia = diaLocal(iso);
  const hoy = hoyISO();
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDias(hoy, -1)) return 'Ayer';
  return fechaCorta(dia);
}

/** Para la lista de conversaciones: la hora si es de hoy y, si no, el día. */
export function cuandoCorto(iso: string): string {
  return diaLocal(iso) === hoyISO() ? horaCorta(iso) : nombreDia(iso);
}

export function Avatar({ nombre, tamano = 40 }: { nombre: string | null; tamano?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: tamano,
          height: tamano,
          backgroundColor: theme.primarySuave,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: theme.text, fontSize: tamano * 0.36, lineHeight: tamano * 0.5 }}>
        {iniciales(nombre)}
      </ThemedText>
    </View>
  );
}

function SeparadorDia({ texto }: { texto: string }) {
  const theme = useTheme();
  return (
    <View style={styles.separador} accessibilityRole="header">
      <View style={[styles.linea, { backgroundColor: theme.border }]} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.textoSeparador}>
        {texto}
      </ThemedText>
      <View style={[styles.linea, { backgroundColor: theme.border }]} />
    </View>
  );
}

/** Conversación con burbujas enviadas (azul, a la derecha) y recibidas (a la izquierda). */
export function ListaMensajes({ mensajes, yoId }: { mensajes: MensajeChat[]; yoId: string }) {
  const theme = useTheme();
  return (
    <View style={styles.mensajes} accessibilityRole="list">
      {mensajes.map((m, i) => {
        const anterior = mensajes[i - 1];
        const siguiente = mensajes[i + 1];
        const nuevoDia = !anterior || diaLocal(anterior.creadoEn) !== diaLocal(m.creadoEn);
        const seguido = (a: MensajeChat | undefined, b: MensajeChat | undefined) =>
          !!a &&
          !!b &&
          a.autorId === b.autorId &&
          diaLocal(a.creadoEn) === diaLocal(b.creadoEn) &&
          Math.abs(new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()) <
            MINUTOS_GRUPO * 60_000;
        const inicioGrupo = nuevoDia || !seguido(anterior, m);
        const finGrupo = !seguido(m, siguiente);
        const mio = m.autorId === yoId;
        const autor = mio ? 'Tú' : (m.autorNombre ?? 'Alguien');
        return (
          <View key={m.id}>
            {nuevoDia ? <SeparadorDia texto={nombreDia(m.creadoEn)} /> : null}
            <View
              accessible
              accessibilityLabel={`${autor}, ${horaCorta(m.creadoEn)}: ${m.texto}`}
              style={[
                styles.filaMensaje,
                mio ? styles.filaMia : null,
                { marginTop: inicioGrupo ? Spacing.three : Spacing.half },
              ]}>
              {!mio ? (
                <View style={styles.huecoAvatar}>
                  {finGrupo ? <Avatar nombre={m.autorNombre} tamano={28} /> : null}
                </View>
              ) : null}
              <View style={[styles.columna, mio ? styles.columnaMia : null]}>
                {!mio && inicioGrupo ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.autor}>
                    {autor}
                  </ThemedText>
                ) : null}
                <View
                  style={[
                    styles.burbuja,
                    mio
                      ? {
                          backgroundColor: theme.primary,
                          borderBottomRightRadius: finGrupo ? Spacing.one : Radius.card,
                          borderTopRightRadius: inicioGrupo ? Radius.card : Spacing.one,
                        }
                      : {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderWidth: 1,
                          borderBottomLeftRadius: finGrupo ? Spacing.one : Radius.card,
                          borderTopLeftRadius: inicioGrupo ? Radius.card : Spacing.one,
                        },
                  ]}>
                  <ThemedText style={mio ? { color: theme.onPrimary } : undefined}>
                    {m.texto}
                  </ThemedText>
                </View>
                {finGrupo ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hora}>
                    {horaCorta(m.creadoEn)}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const ALTO_MIN = 44;
const ALTO_MAX = 160;

/**
 * Campo para escribir que crece con el texto. En la web, Intro envía y Mayús+Intro hace salto
 * de línea. El botón de enviar se ve apagado sin texto, pero se puede pulsar y explica qué falta.
 */
export function Compositor({
  onEnviar,
  enviando,
}: {
  onEnviar: (texto: string) => Promise<boolean>;
  enviando: boolean;
}) {
  const theme = useTheme();
  const [texto, setTexto] = useState('');
  const [alto, setAlto] = useState(ALTO_MIN);
  const [pista, setPista] = useState<string | null>(null);
  const vacio = !texto.trim();

  async function enviar() {
    if (enviando) return;
    if (vacio) {
      setPista('Escribe un mensaje antes de enviar.');
      return;
    }
    setPista(null);
    if (await onEnviar(texto)) {
      setTexto('');
      setAlto(ALTO_MIN);
    }
  }

  function alPulsarTecla(e: TextInputKeyPressEvent) {
    if (Platform.OS !== 'web') return;
    // En react-native-web el evento trae también las teclas modificadoras.
    const evento = e.nativeEvent as TextInputKeyPressEvent['nativeEvent'] & { shiftKey?: boolean };
    if (evento.key === 'Enter' && !evento.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  }

  return (
    <View style={styles.compositor}>
      <View
        style={[
          styles.cajaCompositor,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <TextInput
          accessibilityLabel="Mensaje"
          accessibilityHint={
            Platform.OS === 'web'
              ? 'Intro para enviar, Mayúsculas más Intro para otra línea'
              : undefined
          }
          placeholder="Escribe un mensaje…"
          placeholderTextColor={theme.textSecondary}
          multiline
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            if (pista) setPista(null);
          }}
          onKeyPress={alPulsarTecla}
          onContentSizeChange={(e) =>
            setAlto(Math.min(ALTO_MAX, Math.max(ALTO_MIN, e.nativeEvent.contentSize.height)))
          }
          style={[styles.entrada, { color: theme.text, height: alto }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: vacio, busy: enviando }}
          onPress={enviar}
          style={({ pressed }) => [
            styles.enviar,
            {
              backgroundColor: vacio ? theme.subtle : theme.primary,
              opacity: pressed || enviando ? 0.7 : 1,
            },
          ]}>
          <ThemedText
            type="smallBold"
            style={{ color: vacio ? theme.textSecondary : theme.onPrimary }}>
            {enviando ? '…' : 'Enviar'}
          </ThemedText>
        </Pressable>
      </View>
      {pista ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          accessibilityLiveRegion="polite"
          style={styles.pista}>
          {pista}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  linea: { flex: 1, height: StyleSheet.hairlineWidth },
  textoSeparador: { fontSize: 12, lineHeight: 16 },
  mensajes: { paddingBottom: Spacing.two },
  filaMensaje: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  filaMia: { justifyContent: 'flex-end' },
  huecoAvatar: { width: 28, marginBottom: 20 },
  columna: { maxWidth: '78%', alignItems: 'flex-start', gap: Spacing.half },
  columnaMia: { alignItems: 'flex-end' },
  autor: { fontSize: 12, lineHeight: 16, marginLeft: Spacing.two },
  burbuja: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.card,
  },
  hora: { fontSize: 12, lineHeight: 16, marginHorizontal: Spacing.two },
  compositor: { gap: Spacing.one },
  cajaCompositor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.one + 2,
    borderWidth: 1,
    borderRadius: Radius.card,
  },
  entrada: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
  },
  enviar: {
    minHeight: ALTO_MIN,
    minWidth: 76,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pista: { marginLeft: Spacing.two },
});
