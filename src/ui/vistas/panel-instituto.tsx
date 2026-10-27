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
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { NuevoEvento, ProximasFechas } from './agenda';
import { Cargando, estilosComunes } from './comun';

type Aviso = { tipo: 'error' | 'ok'; texto: string } | null;
const SIN_PROFE = 'sin-profe';

/**
 * El instituto gestiona su centro: a qué profe va cada alumno, cuentas nuevas y convenios.
 * La generalitat elige primero qué instituto quiere gestionar.
 */
export function PanelInstituto() {
  const usuario = useUsuario();
  const esGeneralitat = usuario.rol === 'generalitat';
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
      <Pantalla titulo={esGeneralitat ? 'Institutos' : 'Centro'}>
        {esGeneralitat ? (
          institutos ? (
            <ThemedText themeColor="textSecondary">
              Todavía no hay institutos con alumnos en prácticas.
            </ThemedText>
          ) : (
            <Cargando />
          )
        ) : (
          <Mensaje tipo="error" texto="Tu cuenta no está asociada a ningún centro." />
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
      }>
      {selectorInstituto}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {cargando && !datos ? <Cargando /> : null}
      {datos ? (
        <>
          <TarjetaAlumnos datos={datos} hacer={hacer} />
          <TarjetaCuentasNuevas datos={datos} hacer={hacer} />
          <TarjetaConvenios datos={datos} hacer={hacer} />
          {fechasGenerales}
        </>
      ) : null}
    </Pantalla>
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
        <View style={estilosComunes.fila}>
          <Boton
            texto="Dar de alta y firmar convenio"
            desactivado={nombre.trim().length < 2}
            onPress={nuevaEmpresa}
          />
        </View>
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
      <View>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detalle}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { borderWidth: 1, borderRadius: Radius.control, padding: Spacing.three, gap: Spacing.two },
  bloque: { gap: Spacing.two, marginTop: Spacing.two },
});
