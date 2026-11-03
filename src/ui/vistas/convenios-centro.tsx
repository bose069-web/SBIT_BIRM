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
import { CabeceraSeccion } from '@/ui/components/cabecera-seccion';
import { t } from '@/ui/utils/idioma';
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
  const [creando, setCreando] = useState(true);
  const { centroId, centros, datos, error, cargando, recargar, aviso, hacer } =
    usePanelCentro(centroPedido);
  return (
    <Pantalla
      titulo={t('Convenios')}
      subtitulo={datos?.centro.nombre ?? 'Empresas con las que el centro tiene convenio'}
      amplia={ancho}
      bajoCabecera>
      <CabeceraSeccion
        titulo={t('Empresas y convenios')}
        descripcion={t('Prepara las empresas donde harán las prácticas.')}
        acciones={
          <Boton
            texto={t(creando ? 'Ver convenios' : 'Nuevo convenio')}
            variante={creando ? 'secundario' : 'primario'}
            onPress={() => setCreando(!creando)}
          />
        }
      />
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {centros.error ? <ErrorCarga texto={centros.error} onReintentar={centros.recargar} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {!centroId && !cargando && !centros.error ? (
        <EstadoVacio
          titulo={t('Sin centro')}
          texto={t('Elige un centro desde Inicio para gestionar sus convenios.')}
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
              {creando ? <NuevoConvenio datos={datos} hacer={hacer} /> : null}
            </View>
          </View>
        ) : (
          <View style={styles.bloques}>
            <Cifras datos={datos} />
            {creando ? <NuevoConvenio datos={datos} hacer={hacer} /> : null}
            <ListaConvenios datos={datos} hacer={hacer} />
          </View>
        )
      ) : null}
    </Pantalla>
  );
}

function Cifras({ datos }: { datos: PanelCentro }) {
  return (
    <View style={styles.cifras}>
      <Cifra valor={`${datos.convenios.length}`} etiqueta={t('Con convenio')} />
      <Cifra valor={`${datos.empresasSinConvenio.length}`} etiqueta={t('Empresas sin convenio')} />
    </View>
  );
}

function ListaConvenios({ datos, hacer }: { datos: PanelCentro; hacer: HacerEnCentro }) {
  const usuario = useUsuario();
  const theme = useTheme();
  return (
    <Tarjeta titulo={t('Convenios con empresas ({n})', { n: datos.convenios.length })}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('Los alumnos solo pueden hacer prácticas en empresas con convenio.')}
      </ThemedText>
      {datos.convenios.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t(
            'Todavía no hay convenios. Firma el primero con una empresa existente o da de alta una nueva.',
          )}
        </ThemedText>
      ) : null}
      {datos.convenios.map((c) => (
        <View key={c.empresaId} style={[styles.fila, { borderColor: theme.border }]}>
          <View style={styles.persona}>
            <Avatar nombre={c.empresaNombre} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">{c.empresaNombre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {c.firmadoEn
                  ? t('Firmado el {fecha}', { fecha: fechaCorta(c.firmadoEn) })
                  : t('Sin fecha de firma')}
              </ThemedText>
            </View>
          </View>
          <Boton
            texto={t('Quitar convenio')}
            variante="peligro"
            onPress={() =>
              hacer(
                () => quitarConvenio(container.centros, usuario, c),
                t('Convenio con {empresa} quitado', { empresa: c.empresaNombre }),
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
        <Tarjeta titulo={t('Firmar convenio')}>
          <Selector
            etiqueta={t('Empresa existente')}
            opciones={datos.empresasSinConvenio.map((e) => ({ valor: e.id, texto: e.nombre }))}
            valor={empresaId}
            onCambio={setEmpresaId}
          />
          <Boton
            texto={t('Firmar convenio')}
            desactivado={!empresaId}
            onPress={() => {
              const empresa = datos.empresasSinConvenio.find((e) => e.id === empresaId);
              if (!empresa) return;
              setEmpresaId(null);
              void hacer(
                () =>
                  firmarConvenio(container.centros, usuario, datos.centro.id, empresa.id, hoyISO()),
                t('Convenio firmado con {empresa}', { empresa: empresa.nombre }),
              );
            }}
          />
        </Tarjeta>
      ) : null}
      <Tarjeta titulo={t('Empresa nueva')}>
        <Campo
          etiqueta={t('Nombre')}
          value={nombre}
          onChangeText={setNombre}
          placeholder={t('Empresa SL')}
        />
        <Campo
          etiqueta={t('CIF')}
          value={cif}
          onChangeText={setCif}
          placeholder={t('Opcional')}
          autoCapitalize="characters"
        />
        <Boton
          texto={t('Dar de alta y firmar convenio')}
          desactivado={nombre.trim().length < 2}
          onPress={nuevaEmpresa}
        />
      </Tarjeta>
    </>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  principal: { minWidth: 0, flex: 1.7, gap: Spacing.four },
  lateral: { minWidth: 0, flex: 1, gap: Spacing.four },
  bloques: { gap: Spacing.four },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0, gap: Spacing.half },
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
