import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { generarTokenRecuperacion, solicitudesPendientes } from '@/core/application/recuperacion';
import type { SolicitudContrasena } from '@/core/domain/recuperacion';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Mensaje } from '@/ui/components/mensaje';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';

import { ErrorCarga } from './comun';

/** Mensajes de los alumnos que quieren restablecer su contraseña, con el enlace para hacerlo. */
export function SolicitudesContrasena() {
  const usuario = useUsuario();
  const {
    datos,
    error: errorCarga,
    recargar,
  } = useDatos(() => solicitudesPendientes(container.recuperacion, usuario), [usuario.id]);
  useRecargarAlVolver(recargar);
  // Los enlaces generados se quedan a la vista: al recargar, su solicitud ya no estará pendiente.
  const [generadas, setGeneradas] = useState<{ solicitud: SolicitudContrasena; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState<string | null>(null);

  async function generar(solicitud: SolicitudContrasena) {
    setError(null);
    setGenerando(solicitud.id);
    try {
      const t = await generarTokenRecuperacion(container.recuperacion, usuario, solicitud.id);
      const url = Linking.createURL('/restablecer', { queryParams: { t } });
      setGeneradas((g) => [...g, { solicitud, url }]);
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido generar el enlace');
    } finally {
      setGenerando(null);
    }
  }

  const visibles = generadas.map((g) => g.solicitud.id);
  const pendientes = (datos ?? []).filter((s) => !visibles.includes(s.id));

  return (
    <Tarjeta titulo="Restablecer contraseña">
      {errorCarga ? (
        <ErrorCarga texto="No se pudieron consultar las solicitudes." onReintentar={recargar} />
      ) : datos && pendientes.length === 0 && generadas.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Ningún alumno ha pedido restablecer su contraseña.
        </ThemedText>
      ) : null}
      {pendientes.map((s) => (
        <View key={s.id} style={styles.fila}>
          <View style={styles.texto}>
            <ThemedText type="smallBold">
              {s.alumnoNombre} quiere restablecer su contraseña
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {s.alumnoEmail}
            </ThemedText>
          </View>
          <Boton
            texto="Generar enlace"
            accessibilityLabel={`Generar enlace para ${s.alumnoNombre}`}
            variante="secundario"
            cargando={generando === s.id}
            desactivado={generando !== null}
            onPress={() => generar(s)}
          />
        </View>
      ))}
      {generadas.map((g) => (
        <EnlaceGenerado key={g.solicitud.id} nombre={g.solicitud.alumnoNombre} url={g.url} />
      ))}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
    </Tarjeta>
  );
}

function EnlaceGenerado({ nombre, url }: { nombre: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    if (Platform.OS !== 'web') {
      await Share.share({ message: url });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      // Sin permiso para el portapapeles, la URL sigue a la vista para seleccionarla.
      setCopiado(false);
    }
  }

  return (
    <View style={styles.enlace}>
      <ThemedText type="smallBold">Enlace para {nombre}</ThemedText>
      <ThemedText type="small" selectable style={styles.url}>
        {url}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Pásaselo solo a tu alumno, en privado. Sirve una vez y caduca en una hora.
      </ThemedText>
      <Boton
        texto={Platform.OS === 'web' ? (copiado ? 'Copiado' : 'Copiar enlace') : 'Compartir enlace'}
        variante="secundario"
        onPress={compartir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  texto: { flex: 1, minWidth: 160 },
  enlace: { gap: 8 },
  url: { flexShrink: 1 },
});
