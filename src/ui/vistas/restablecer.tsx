import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { restablecerContrasena } from '@/core/application/recuperacion';
import type { CredencialRecuperacion } from '@/core/domain/recuperacion';
import { container } from '@/config/container';
import { BarraContrasena } from '@/ui/components/barra-contrasena';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';

/** El enlace enviado por correo trae la sesión tras la almohadilla de la URL. */
function credencialDelCorreo(): CredencialRecuperacion | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const datos = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = datos.get('access_token');
  const refreshToken = datos.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

/**
 * Pide la contraseña nueva. El código no se gasta hasta guardar: así, abrir el enlace (o que lo
 * previsualice el chat por el que llega) no lo invalida.
 */
export function VistaRestablecer({
  token,
  onTerminar,
}: {
  token: string | null;
  onTerminar: () => void;
}) {
  const theme = useTheme();
  const [credencial] = useState(() => (token ? { token } : credencialDelCorreo()));
  const [contrasena, setContrasena] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  async function guardar() {
    if (!credencial) return;
    setError(null);
    setGuardando(true);
    try {
      await restablecerContrasena(container.recuperacion, credencial, contrasena, repetida);
      setHecho(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[styles.fondo, { backgroundColor: theme.background }]}>
      <View style={[styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText accessibilityRole="header" type="subtitle">
          Nueva contraseña
        </ThemedText>
        {hecho ? (
          <Mensaje tipo="ok" texto="Contraseña cambiada. Ya puedes iniciar sesión con ella." />
        ) : !credencial ? (
          <Mensaje tipo="error" texto="Este enlace no es válido. Pide uno nuevo a tu profe." />
        ) : (
          <>
            <Campo
              etiqueta="Contraseña nueva"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              autoComplete="new-password"
              ayuda="Al menos 8 caracteres"
            />
            <BarraContrasena contrasena={contrasena} />
            <Campo
              etiqueta="Repite la contraseña"
              value={repetida}
              onChangeText={setRepetida}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={guardar}
            />
            {error ? <Mensaje tipo="error" texto={error} /> : null}
            <Boton texto="Guardar contraseña" onPress={guardar} cargando={guardando} />
          </>
        )}
        <Boton
          texto="Ir al inicio de sesión"
          variante="secundario"
          desactivado={guardando}
          onPress={onTerminar}
        />
      </View>
    </View>
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
});
