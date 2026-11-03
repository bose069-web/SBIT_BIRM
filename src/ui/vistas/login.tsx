import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import * as Linking from 'expo-linking';

import { pedirRecuperacion } from '@/core/application/recuperacion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { ThemedText } from '@/ui/components/themed-text';
import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useSesion } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';

import { Portada } from './portada';
import { Selector } from '@/ui/components/selector';
import { useIdioma } from '@/ui/hooks/use-idioma';
import { OPCIONES_IDIOMA } from '@/ui/utils/traducciones/opciones';
import { t } from '@/ui/utils/idioma';

const CUENTAS_DEMO = [
  { rol: 'Alumno', email: 'alumno@kampus.test' },
  { rol: 'Empresa', email: 'empresa@kampus.test' },
  { rol: 'Profe', email: 'profe@kampus.test' },
  { rol: 'Instituto', email: 'instituto@kampus.test' },
  { rol: 'Generalitat', email: 'generalitat@kampus.test' },
];

export function VistaLogin() {
  const theme = useTheme();
  const oscuro = useColorScheme() === 'dark';
  const { entrar } = useSesion();
  const { idioma, cambiarIdioma } = useIdioma();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e = email, c = contrasena) {
    setError(null);
    setEnviando(true);
    try {
      await entrar(e, c);
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t('No se ha podido iniciar sesión'));
      setEnviando(false);
    }
  }

  const [recuperando, setRecuperando] = useState(false);
  const [pedida, setPedida] = useState(false);

  async function pedir() {
    setError(null);
    setEnviando(true);
    try {
      await pedirRecuperacion(container.recuperacion, email, Linking.createURL('/restablecer'));
      setPedida(true);
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t('No se ha podido enviar la solicitud'));
    } finally {
      setEnviando(false);
    }
  }

  function alternarRecuperacion() {
    setError(null);
    setPedida(false);
    setRecuperando((v) => !v);
  }

  const enlaceRecuperar = (
    <Pressable
      accessibilityRole="button"
      onPress={alternarRecuperacion}
      style={({ pressed }) => [styles.enlace, pressed && { opacity: 0.6 }]}>
      <ThemedText type="small" themeColor="primary">
        {recuperando ? t('Volver a iniciar sesión') : t('¿Has olvidado tu contraseña?')}
      </ThemedText>
    </Pressable>
  );

  const { width } = useWindowDimensions();
  // En la web horizontal el acceso va dentro de la portada; en el móvil, solo.
  const conPortada = Platform.OS === 'web' && width >= 900;

  const caja = (
    <View style={[styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Image
        accessibilityLabel="Kampus"
        source={
          oscuro
            ? require('@/assets/brand/kampus-logotipo-blanco.png')
            : require('@/assets/brand/kampus-logotipo.png')
        }
        style={styles.logo}
        resizeMode="contain"
      />
      <ThemedText themeColor="textSecondary">
        {t('Seguimiento de las prácticas FCT y Dual')}
      </ThemedText>
      <Selector
        etiqueta={t('Idioma')}
        opciones={OPCIONES_IDIOMA}
        valor={idioma}
        onCambio={cambiarIdioma}
      />

      <Campo
        etiqueta={t('Correo')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={t('nombre@centro.cat')}
      />
      {recuperando ? (
        <>
          {pedida ? (
            <Mensaje
              tipo="ok"
              texto={t(
                'Solicitud enviada. Si eres alumno, tu profe te pasará un enlace; si no, lo recibirás por correo.',
              )}
            />
          ) : null}
          {error ? <Mensaje tipo="error" texto={error} /> : null}
          <Boton
            texto={t('Pedir recuperación')}
            onPress={pedir}
            cargando={enviando}
            desactivado={pedida}
          />
        </>
      ) : (
        <>
          <Campo
            etiqueta={t('Contraseña')}
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={() => enviar()}
          />
          {error ? <Mensaje tipo="error" texto={error} /> : null}
          <Boton texto={t('Entrar')} onPress={() => enviar()} cargando={enviando} />
        </>
      )}
      {enlaceRecuperar}

      {__DEV__ ? (
        <View style={[styles.demo, { borderTopColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('Cuentas de prueba (contraseña kampus)')}
          </ThemedText>
          <View style={styles.filaDemo}>
            {CUENTAS_DEMO.map((c) => (
              <Boton
                key={c.email}
                texto={t(c.rol)}
                variante="secundario"
                desactivado={enviando}
                onPress={() => {
                  setEmail(c.email);
                  setContrasena('kampus');
                  enviar(c.email, 'kampus');
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (conPortada) return <Portada acceso={caja} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fondo, { backgroundColor: theme.background }]}>
      {caja}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  caja: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  enlace: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 170, height: 48 },
  demo: { borderTopWidth: 1, paddingTop: Spacing.three, gap: Spacing.two },
  filaDemo: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
