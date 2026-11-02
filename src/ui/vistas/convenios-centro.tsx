import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  darDeAltaEmpresa,
  firmarConvenio,
  quitarConvenio,
  type PanelCentro,
} from '@/core/application/centro';
import { container } from '@/config/container';
import { Avatar } from '@/ui/components/avatar';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Cifra } from '@/ui/components/cifra';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { usePanelCentro, type HacerEnCentro } from '@/ui/hooks/use-panel-centro';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

/** Segundo nivel del panel del centro: convenios con empresas y altas de empresas. */
export function ConveniosCentro({ centroPedido }: { centroPedido: string | null }) {
  const ancho = useWebAncha();
  const { centroId, centros, datos, error, cargando, recargar, aviso, hacer } =
    usePanelCentro(centroPedido);
  return (
    <Pantalla
      titulo="Convenios"
      subtitulo={datos?.centro.nombre ?? 'Empresas con las que el centro tiene convenio'}
      amplia={ancho}
      bajoCabecera>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {centros.error ? <ErrorCarga texto={centros.error} onReintentar={centros.recargar} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {!centroId && !cargando && !centros.error ? (
        <EstadoVacio
          titulo="Sin centro"
          texto="Elige un centro desde Inicio para gestionar sus convenios."
        />
      ) : null}
      {datos ? (
        ancho ? (
          <View style={styles.columnas}>
            <View style={styles.principal}>
              <Cifras datos={datos} />
              <ListaConvenios datos={datos} hacer={hacer} />
            </View>
            <View style={styles.lateral}>
              <NuevoConvenio datos={datos} hacer={hacer} />
            </View>
          </View>
        ) : (
          <View style={styles.bloques}>
            <Cifras datos={datos} />
            <ListaConvenios datos={datos} hacer={hacer} />
            <NuevoConvenio datos={datos} hacer={hacer} />
          </View>
        )
      ) : null}
    </Pantalla>
  );
}

function Cifras({ datos }: { datos: PanelCentro }) {
  return (
    <View style={styles.cifras}>
      <Cifra valor={`${datos.convenios.length}`} etiqueta="Con convenio" />
      <Cifra valor={`${datos.empresasSinConvenio.length}`} etiqueta="Empresas sin convenio" />
    </View>
  );
}

function ListaConvenios({ datos, hacer }: { datos: PanelCentro; hacer: HacerEnCentro }) {
  const usuario = useUsuario();
  const theme = useTheme();
  return (
    <Tarjeta titulo={`Convenios con empresas (${datos.convenios.length})`}>
      <ThemedText type="small" themeColor="textSecondary">
        Los alumnos solo pueden hacer prácticas en empresas con convenio.
      </ThemedText>
      {datos.convenios.map((c) => (
        <View key={c.empresaId} style={[styles.fila, { borderColor: theme.border }]}>
          <View style={styles.persona}>
            <Avatar nombre={c.empresaNombre} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">{c.empresaNombre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {c.firmadoEn ? `Firmado el ${fechaCorta(c.firmadoEn)}` : 'Sin fecha de firma'}
              </ThemedText>
            </View>
          </View>
          <Boton
            texto="Quitar convenio"
            variante="peligro"
            onPress={() =>
              hacer(
                () => quitarConvenio(container.centros, usuario, c),
                `Convenio con ${c.empresaNombre} quitado`,
              )
            }
          />
        </View>
      ))}
    </Tarjeta>
  );
}

function NuevoConvenio({ datos, hacer }: { datos: PanelCentro; hacer: HacerEnCentro }) {
  const usuario = useUsuario();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [cif, setCif] = useState('');

  async function nuevaEmpresa() {
    await hacer(async () => {
      const empresa = await darDeAltaEmpresa(container.centros, usuario, nombre, cif);
      await firmarConvenio(container.centros, usuario, datos.centro.id, empresa.id, hoyISO());
      setNombre('');
      setCif('');
    }, 'Empresa dada de alta y convenio firmado');
  }

  return (
    <>
      {datos.empresasSinConvenio.length > 0 ? (
        <Tarjeta titulo="Firmar convenio">
          <Selector
            etiqueta="Empresa existente"
            opciones={datos.empresasSinConvenio.map((e) => ({ valor: e.id, texto: e.nombre }))}
            valor={empresaId}
            onCambio={setEmpresaId}
          />
          <Boton
            texto="Firmar convenio"
            desactivado={!empresaId}
            onPress={() => {
              const empresa = datos.empresasSinConvenio.find((e) => e.id === empresaId);
              if (!empresa) return;
              setEmpresaId(null);
              void hacer(
                () =>
                  firmarConvenio(container.centros, usuario, datos.centro.id, empresa.id, hoyISO()),
                `Convenio firmado con ${empresa.nombre}`,
              );
            }}
          />
        </Tarjeta>
      ) : null}
      <Tarjeta titulo="Empresa nueva">
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Empresa SL" />
        <Campo
          etiqueta="CIF"
          value={cif}
          onChangeText={setCif}
          placeholder="Opcional"
          autoCapitalize="characters"
        />
        <Boton
          texto="Dar de alta y firmar convenio"
          desactivado={nombre.trim().length < 2}
          onPress={nuevaEmpresa}
        />
      </Tarjeta>
    </>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  principal: { flex: 1.7, gap: Spacing.four },
  lateral: { flex: 1, gap: Spacing.four },
  bloques: { gap: Spacing.four },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1, gap: 2 },
  persona: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.button,
    padding: Spacing.three,
  },
});
