import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  crearCentro,
  darDeBajaCentro,
  editarCentro,
  obtenerPanelGeneralitat,
  reactivarCentro,
} from '@/core/application/centro';
import { buscarInstitutos, estaDeBaja, type Centro } from '@/core/domain/centro';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { NuevoEvento, ProximasFechas } from './agenda';
import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

type Aviso = { tipo: 'error' | 'ok'; texto: string } | null;

/** Cuántos institutos se enseñan a la vez: con más, se pide afinar la búsqueda. */
const MAXIMO_LISTA = 25;

/**
 * Inicio de la generalitat: la lista de institutos de la red, con buscador, y su gestión (dar de
 * alta, editar, dar de baja y reactivar). Lo de dentro de cada instituto (alumnos, horas,
 * convenios…) solo se ve al entrar en él, en `/?centro=<id>`: con cien institutos, las sumas de
 * toda la red no dicen nada.
 */
export function PanelGeneralitat() {
  const usuario = useUsuario();
  const ancho = useWebAncha();
  const hoy = hoyISO();
  const { datos, error, cargando, recargar } = useDatos(
    () => obtenerPanelGeneralitat(container.centros, usuario),
    [usuario.id],
  );
  useRecargarAlVolver(recargar);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [busqueda, setBusqueda] = useState('');
  const encontrados = datos ? buscarInstitutos(datos.institutos, busqueda) : [];
  const visibles = encontrados.slice(0, MAXIMO_LISTA);

  async function hacer(accion: () => Promise<unknown>, ok: string): Promise<boolean> {
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: ok });
      recargar();
      return true;
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }

  return (
    <Pantalla
      titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      subtitulo={
        datos
          ? `${fechaCorta(hoy)} · ${datos.activos} ${datos.activos === 1 ? 'instituto activo' : 'institutos activos'}${datos.deBaja ? ` · ${datos.deBaja} de baja` : ''}`
          : fechaCorta(hoy)
      }
      amplia={ancho}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {datos ? (
        <View style={ancho ? styles.columnas : styles.columna}>
          <View style={ancho ? styles.principal : styles.columna}>
            <Tarjeta titulo={`Institutos (${datos.institutos.length})`}>
              {datos.institutos.length === 0 ? (
                <EstadoVacio
                  titulo="Todavía no hay institutos"
                  texto="Da de alta el primero con el formulario de nuevo instituto."
                />
              ) : (
                <>
                  <Campo
                    etiqueta="Buscar instituto"
                    placeholder="Nombre o código"
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                  />
                  {encontrados.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Ningún instituto coincide con «{busqueda.trim()}».
                    </ThemedText>
                  ) : (
                    <View>
                      {visibles.map((c, i) => (
                        <FilaInstituto key={c.id} centro={c} primera={i === 0} hacer={hacer} />
                      ))}
                    </View>
                  )}
                  {encontrados.length > MAXIMO_LISTA ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Se ven {MAXIMO_LISTA} de {encontrados.length}. Escribe parte del nombre o el
                      código para encontrar el que buscas.
                    </ThemedText>
                  ) : null}
                </>
              )}
            </Tarjeta>
          </View>
          <View style={ancho ? styles.lateral : styles.columna}>
            <NuevoInstituto
              onCrear={(nombre, codigo) =>
                hacer(
                  () => crearCentro(container.centros, usuario, { nombre, codigo }),
                  `${nombre.trim()} dado de alta`,
                )
              }
            />
            <Tarjeta titulo="Fechas para todos">
              <ThemedText type="small" themeColor="textSecondary">
                Festivos, entregas o reuniones generales: los ven todos los alumnos de la red.
              </ThemedText>
              <ProximasFechas hoy={hoy} soloGenerales />
              <NuevoEvento />
            </Tarjeta>
          </View>
        </View>
      ) : null}
    </Pantalla>
  );
}

/** Un instituto: nombre, código y estado. Se despliega para editar o dar de baja. */
function FilaInstituto({
  centro,
  primera,
  hacer,
}: {
  centro: Centro;
  primera: boolean;
  hacer: (accion: () => Promise<unknown>, ok: string) => Promise<boolean>;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [modo, setModo] = useState<'nada' | 'editar' | 'baja'>('nada');
  const [nombre, setNombre] = useState(centro.nombre);
  const [codigo, setCodigo] = useState(centro.codigo ?? '');
  const [motivo, setMotivo] = useState('');
  const baja = estaDeBaja(centro);

  return (
    <View style={[styles.fila, !primera && { borderTopWidth: 1, borderColor: theme.border }]}>
      <View style={styles.cabecera}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor={baja ? 'textSecondary' : 'text'}>
            {centro.nombre}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {centro.codigo ? `Código ${centro.codigo}` : 'Sin código'}
          </ThemedText>
        </View>
        {baja ? (
          <Chip texto="De baja" color="textSecondary" />
        ) : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Gestionar ${centro.nombre}`}
            hitSlop={8}
            onPress={() => router.push({ pathname: '/', params: { centro: centro.id } })}
            style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <ThemedText type="small" themeColor="textSecondary">
              Gestionar ›
            </ThemedText>
          </Pressable>
        )}
      </View>

      {baja ? (
        <ThemedText type="small" themeColor="textSecondary">
          De baja desde el {fechaCorta((centro.dadoDeBajaEn ?? '').slice(0, 10))}:{' '}
          {centro.motivoBaja}
        </ThemedText>
      ) : null}

      <View style={styles.botones}>
        {baja ? (
          <Boton
            texto="Reactivar"
            variante="secundario"
            onPress={() =>
              hacer(
                () => reactivarCentro(container.centros, usuario, centro),
                `${centro.nombre} vuelve a estar activo`,
              )
            }
          />
        ) : (
          <>
            <Boton
              texto={modo === 'editar' ? 'Cancelar' : 'Editar'}
              variante="secundario"
              onPress={() => setModo(modo === 'editar' ? 'nada' : 'editar')}
            />
            <Boton
              texto={modo === 'baja' ? 'Cancelar' : 'Dar de baja'}
              variante="secundario"
              onPress={() => setModo(modo === 'baja' ? 'nada' : 'baja')}
            />
          </>
        )}
      </View>

      {modo === 'editar' && !baja ? (
        <View style={styles.formulario}>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} />
          <Campo
            etiqueta="Código del centro"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            ayuda="8 dígitos"
          />
          <Boton
            texto="Guardar cambios"
            desactivado={!nombre.trim()}
            onPress={async () => {
              const ok = await hacer(
                () => editarCentro(container.centros, usuario, centro.id, { nombre, codigo }),
                'Cambios guardados',
              );
              if (ok) setModo('nada');
            }}
          />
        </View>
      ) : null}

      {modo === 'baja' && !baja ? (
        <View style={styles.formulario}>
          <ThemedText type="small" themeColor="textSecondary">
            El instituto no se borra: queda en la lista con todo su historial, pero no se pueden
            crear dossiers nuevos. Puedes reactivarlo cuando quieras.
          </ThemedText>
          <Campo
            etiqueta="Motivo de la baja"
            value={motivo}
            onChangeText={setMotivo}
            multiline
            placeholder="Cierre del centro, fusión con otro instituto…"
          />
          <Boton
            texto="Dar de baja el instituto"
            desactivado={!motivo.trim()}
            onPress={async () => {
              const ok = await hacer(
                () => darDeBajaCentro(container.centros, usuario, centro, motivo),
                `${centro.nombre} dado de baja`,
              );
              if (ok) setModo('nada');
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Formulario plegado para dar de alta un instituto. */
function NuevoInstituto({
  onCrear,
}: {
  onCrear: (nombre: string, codigo: string) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  return (
    <Tarjeta titulo="Nuevo instituto">
      {!abierto ? (
        <Boton texto="+ Dar de alta un instituto" onPress={() => setAbierto(true)} />
      ) : (
        <View style={styles.formulario}>
          <Campo
            etiqueta="Nombre"
            placeholder="Institut Vidal i Barraquer"
            value={nombre}
            onChangeText={setNombre}
          />
          <Campo
            etiqueta="Código del centro"
            placeholder="43000000"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            ayuda="8 dígitos, el código oficial del Departament"
          />
          <Boton
            texto="Dar de alta"
            desactivado={!nombre.trim() || !codigo.trim()}
            onPress={async () => {
              if (await onCrear(nombre, codigo)) {
                setNombre('');
                setCodigo('');
                setAbierto(false);
              }
            }}
          />
          <Boton texto="Cancelar" variante="secundario" onPress={() => setAbierto(false)} />
        </View>
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  columna: { gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  fila: { gap: Spacing.two, paddingVertical: Spacing.three },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  formulario: { gap: Spacing.two },
});
