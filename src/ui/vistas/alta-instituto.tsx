import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { crearCentro } from '@/core/application/centro';
import type { Centro } from '@/core/domain/centro';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { t } from '@/ui/utils/idioma';

/**
 * Alta de un instituto nuevo, solo para la generalitat. Pide el nombre y el código de centro
 * (8 dígitos); al crearlo, el panel pasa a gestionarlo.
 */
export function AltaInstituto({
  onCreado,
  abierto: abiertoInicial = false,
}: {
  onCreado: (centro: Centro) => void;
  abierto?: boolean;
}) {
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <Boton
        texto={t('+ Dar de alta un instituto')}
        variante="secundario"
        onPress={() => setAbierto(true)}
      />
    );
  }

  async function guardar() {
    if (guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const centro = await crearCentro(container.centros, usuario, { nombre, codigo });
      setNombre('');
      setCodigo('');
      setAbierto(abiertoInicial);
      onCreado(centro);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('No se ha podido dar de alta el instituto'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.formulario}>
      <Campo
        etiqueta={t('Nombre del instituto')}
        value={nombre}
        onChangeText={setNombre}
        placeholder={t('Institut Joan Miró')}
      />
      <Campo
        etiqueta={t('Código de centro')}
        value={codigo}
        onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 8))}
        keyboardType="number-pad"
        placeholder="08000000"
        ayuda={t('Los 8 dígitos del código del Departament.')}
        onSubmitEditing={guardar}
      />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <View style={styles.botones}>
        <Boton texto={t('Dar de alta')} onPress={guardar} cargando={guardando} />
        {abiertoInicial ? null : (
          <Boton
            texto={t('Cancelar')}
            variante="secundario"
            onPress={() => {
              setAbierto(false);
              setError(null);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: { gap: Spacing.three },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
