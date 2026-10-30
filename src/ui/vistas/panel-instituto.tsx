import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listarDossiers } from '@/core/application/dossier';
import {
  asignarProfe,
  darDeAltaEmpresa,
  firmarConvenio,
  incorporarAlumno,
  obtenerPanelCentro,
  quitarConvenio,
  type PanelCentro,
} from '@/core/application/centro';
import type { Persona } from '@/core/domain/centro';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { NuevoEvento, ProximasFechas } from './agenda';
import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';

type Aviso = { tipo: 'error' | 'ok'; texto: string } | null;
const SIN_PROFE = 'sin-profe';

/**
 * El instituto gestiona su centro: a qué profe va cada alumno, cuentas nuevas y convenios.
 * La generalitat elige primero qué instituto quiere gestionar.
 * En la web ancha, gestión a la izquierda y agenda a la derecha, como el alumno.
 */
export function PanelInstituto() {
  const usuario = useUsuario();
  const esGeneralitat = usuario.rol === 'generalitat';
  const ancho = useWebAncha();
  const [elegido, setElegido] = useState<string | null>(null);
  // La generalitat ve todos los dossiers: de ahí salen los institutos que tienen alumnos.
  const { datos: institutos } = useDatos(async () => {
    if (!esGeneralitat) return [];
    const dossiers = await listarDossiers(container.dossiers);
    const porId = new Map(dossiers.map((d) => [d.centroId, d.centro ?? 'Centro sin nombre']));
    return [...porId]
      .map(([id, nombre]) => ({ valor: id, texto: nombre }))
      .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  }, [esGeneralitat]);
  const centroId = esGeneralitat ? (elegido ?? institutos?.[0]?.valor ?? null) : usuario.centroId;
  const [aviso, setAviso] = useState<Aviso>(null);
  const { datos, error, cargando, recargar } = useDatos(
    async () => (centroId ? obtenerPanelCentro(container.centros, usuario, centroId) : null),
    [centroId, usuario.id],
  );

  // Ejecuta una acción, muestra el resultado y recarga el panel.
  async function hacer(accion: () => Promise<unknown>, ok: string) {
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: ok });
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    }
  }

  const selectorInstituto =
    esGeneralitat && institutos && institutos.length > 0 ? (
      <Tarjeta titulo="Instituto">
        <Selector
          opciones={institutos}
          valor={centroId}
          onCambio={(id) => {
            setAviso(null);
            setElegido(id);
          }}
        />
      </Tarjeta>
    ) : null;

  const fechasGenerales = (
    <Tarjeta titulo="Fechas para todos">
      <ThemedText type="small" themeColor="textSecondary">
        Festivos, entregas o reuniones generales: los ven todos los alumnos en su calendario.
      </ThemedText>
      <ProximasFechas hoy={hoyISO()} />
      <NuevoEvento />
    </Tarjeta>
  );

  if (!centroId) {
    return (
      <Pantalla titulo={esGeneralitat ? 'Institutos' : 'Centro'} amplia={ancho} bajoCabecera>
        {esGeneralitat ? (
          institutos ? (
            <EstadoVacio
              titulo="Todavía no hay institutos con alumnos"
              texto="Cuando haya dossiers en algún centro, aparecerá aquí para poder gestionarlo."
              accion={{ texto: 'Volver a mirar', onPress: () => setElegido(null) }}
            />
          ) : (
            <EsqueletoPanel tarjetas={1} />
          )
        ) : (
          <ErrorCarga texto="Tu cuenta no está asociada a ningún centro." onReintentar={recargar} />
        )}
        {esGeneralitat ? fechasGenerales : null}
      </Pantalla>
    );
  }

  return (
    <Pantalla
      titulo={datos?.centro.nombre ?? 'Centro'}
      subtitulo={
        esGeneralitat ? 'Gestión del instituto como Generalitat' : 'Alumnos, profes y convenios'
      }
      amplia={ancho}
      bajoCabecera>
      {selectorInstituto}
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={3} /> : null}
      {!cargando && !datos && !error ? (
        <EstadoVacio
          titulo="No se pudo cargar el centro"
          texto="Revisa la conexión y vuelve a intentarlo."
          accion={{ texto: 'Reintentar', onPress: recargar }}
        />
      ) : null}
      {datos ? (
        <Columnas
          ancho={ancho}
          izquierda={
            <>
              <CifrasCentro datos={datos} />
              <TarjetaAlumnos datos={datos} hacer={hacer} />
              <TarjetaCuentasNuevas datos={datos} hacer={hacer} />
              <TarjetaConvenios datos={datos} hacer={hacer} />
            </>
          }
          derecha={fechasGenerales}
        />
      ) : null}
    </Pantalla>
  );
}

/** Resumen del centro: cifras de un vistazo, como el progreso del alumno. */
function CifrasCentro({ datos }: { datos: PanelCentro }) {
  const sinProfe = datos.alumnos.filter((a) => !a.profeId).length;
  const cifras = [
    { valor: datos.alumnos.length, etiqueta: 'alumnos' },
    { valor: datos.profes.length, etiqueta: 'profes' },
    { valor: datos.convenios.length, etiqueta: 'convenios' },
    { valor: datos.cuentasNuevas.length, etiqueta: 'cuentas nuevas' },
  ];
  return (
    <Tarjeta titulo="El centro en cifras">
      <View style={styles.cifras}>
        {cifras.map((c) => (
          <View key={c.etiqueta} style={styles.cifra}>
            <ThemedText type="title">{c.valor}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {c.etiqueta}
            </ThemedText>
          </View>
        ))}
      </View>
      {sinProfe > 0 ? (
        <Chip texto={`${sinProfe} alumnos sin profe asignado`} color="estadoPendiente" />
      ) : null}
    </Tarjeta>
  );
}

type Hacer = (accion: () => Promise<unknown>, ok: string) => Promise<void>;

function TarjetaAlumnos({ datos, hacer }: { datos: PanelCentro; hacer: Hacer }) {
  const usuario = useUsuario();
  const sinProfe = datos.alumnos.filter((a) => !a.profeId).length;
  const opciones = [
    ...datos.profes.map((p) => ({ valor: p.id, texto: p.nombre })),
    { valor: SIN_PROFE, texto: 'Sin profe' },
  ];

  function cambiar(alumno: Persona, valor: string) {
    const profe = datos.profes.find((p) => p.id === valor) ?? null;
    void hacer(
      () => asignarProfe(container.centros, usuario, alumno, profe),
      profe ? `${alumno.nombre} asignado a ${profe.nombre}` : `${alumno.nombre} queda sin profe`,
    );
  }

  return (
    <Tarjeta titulo={`Alumnos (${datos.alumnos.length})`}>
      {sinProfe > 0 ? (
        <Chip texto={`${sinProfe} sin profe asignado`} color="estadoPendiente" />
      ) : null}
      {datos.profes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay profes en el centro.
        </ThemedText>
      ) : null}
      {datos.alumnos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay alumnos en el centro.
        </ThemedText>
      ) : (
        datos.alumnos.map((a) => (
          <Fila key={a.id} titulo={a.nombre} detalle={a.email}>
            <Selector
              etiqueta="Profe tutor"
              opciones={opciones}
              valor={a.profeId ?? SIN_PROFE}
              onCambio={(v) => cambiar(a, v)}
            />
          </Fila>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaCuentasNuevas({ datos, hacer }: { datos: PanelCentro; hacer: Hacer }) {
  const usuario = useUsuario();
  if (datos.cuentasNuevas.length === 0) return null;
  return (
    <Tarjeta titulo={`Cuentas nuevas (${datos.cuentasNuevas.length})`}>
      <ThemedText type="small" themeColor="textSecondary">
        Se han registrado y aún no son de ningún centro. Añádelas como alumnos del tuyo.
      </ThemedText>
      {datos.cuentasNuevas.map((p) => (
        <Fila key={p.id} titulo={p.nombre} detalle={p.email}>
          <Boton
            texto="Añadir como alumno"
            variante="secundario"
            onPress={() =>
              hacer(
                () => incorporarAlumno(container.centros, usuario, p, datos.centro.id),
                `${p.nombre} ya es alumno de ${datos.centro.nombre}`,
              )
            }
          />
        </Fila>
      ))}
    </Tarjeta>
  );
}

function TarjetaConvenios({ datos, hacer }: { datos: PanelCentro; hacer: Hacer }) {
  const usuario = useUsuario();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [cif, setCif] = useState('');

  function firmar(id: string, texto: string) {
    void hacer(
      () => firmarConvenio(container.centros, usuario, datos.centro.id, id, hoyISO()),
      texto,
    );
    setEmpresaId(null);
  }

  async function nuevaEmpresa() {
    await hacer(async () => {
      const empresa = await darDeAltaEmpresa(container.centros, usuario, nombre, cif);
      await firmarConvenio(container.centros, usuario, datos.centro.id, empresa.id, hoyISO());
      setNombre('');
      setCif('');
    }, `Empresa dada de alta y convenio firmado`);
  }

  return (
    <Tarjeta titulo={`Convenios con empresas (${datos.convenios.length})`}>
      <ThemedText type="small" themeColor="textSecondary">
        Los alumnos solo pueden hacer prácticas en empresas con convenio.
      </ThemedText>
      {datos.convenios.map((c) => (
        <Fila
          key={c.empresaId}
          titulo={c.empresaNombre}
          detalle={c.firmadoEn ? `Firmado el ${fechaCorta(c.firmadoEn)}` : 'Sin fecha de firma'}>
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
        </Fila>
      ))}

      {datos.empresasSinConvenio.length > 0 ? (
        <View style={styles.bloque}>
          <Selector
            etiqueta="Firmar convenio con una empresa existente"
            opciones={datos.empresasSinConvenio.map((e) => ({ valor: e.id, texto: e.nombre }))}
            valor={empresaId}
            onCambio={setEmpresaId}
          />
          <Boton
            texto="Firmar convenio"
            desactivado={!empresaId}
            onPress={() => {
              const empresa = datos.empresasSinConvenio.find((e) => e.id === empresaId);
              if (empresa) firmar(empresa.id, `Convenio firmado con ${empresa.nombre}`);
            }}
          />
        </View>
      ) : null}

      <View style={styles.bloque}>
        <ThemedText type="smallBold">Dar de alta una empresa nueva</ThemedText>
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
      </View>
    </Tarjeta>
  );
}

function Fila({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.fila, { borderColor: theme.border }]}>
      <View style={styles.filaTexto}>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detalle}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

/** Dos columnas en la web ancha (la principal más ancha); en el móvil, todo seguido. */
function Columnas({
  ancho,
  izquierda,
  derecha,
}: {
  ancho: boolean;
  izquierda: ReactNode;
  derecha: ReactNode;
}) {
  if (!ancho) {
    return (
      <>
        {izquierda}
        {derecha}
      </>
    );
  }
  return (
    <View style={styles.columnas}>
      <View style={styles.principal}>{izquierda}</View>
      <View style={styles.lateral}>{derecha}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  cifra: { alignItems: 'center', gap: 2, minWidth: 64 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  filaTexto: { flex: 1, gap: 2 },
  bloque: { gap: Spacing.two, marginTop: Spacing.two },
});
