import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { ThemedText } from '@/ui/components/themed-text';
import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useSesion } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';

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
      setError(err instanceof Error ? err.message : 'No se ha podido iniciar sesión');
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fondo, { backgroundColor: theme.background }]}>
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
        <ThemedText themeColor="textSecondary">Seguimiento de las prácticas FCT y Dual</ThemedText>

        <Campo
          etiqueta="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="nombre@centro.cat"
        />
        <Campo
          etiqueta="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={() => enviar()}
        />
        {error ? <Mensaje tipo="error" texto={error} /> : null}
        <Boton texto="Entrar" onPress={() => enviar()} cargando={enviando} />

        {__DEV__ ? (
          <View style={[styles.demo, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Cuentas de prueba (contraseña kampus)
            </ThemedText>
            <View style={styles.filaDemo}>
              {CUENTAS_DEMO.map((c) => (
                <Boton
                  key={c.email}
                  texto={c.rol}
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
  logo: { width: 170, height: 48 },
  demo: { borderTopWidth: 1, paddingTop: Spacing.three, gap: Spacing.two },
  filaDemo: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
