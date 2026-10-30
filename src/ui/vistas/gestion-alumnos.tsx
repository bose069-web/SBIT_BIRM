import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { puedeCrearDossier } from '@/core/application/dossier';
import {
  asignarProfe,
  darDeAltaAlumno,
  incorporarAlumno,
  type PanelCentro,
} from '@/core/application/centro';
import type { Persona } from '@/core/domain/centro';
import { AltaSinIncorporarError } from '@/core/domain/errores';
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
import { Fonts, Radius, Spacing } from '@/ui/theme/theme';
import { generarContrasena } from '@/ui/utils/contrasena';

import { ErrorCarga, EsqueletoPanel, EstadoVacio } from './comun';
import { ContenidoSeguimiento } from './seguimiento-profe';

const SIN_PROFE = 'sin-profe';
type Seccion = 'personas' | 'seguimiento';
/** Vive solo en memoria, mientras se muestra: nunca se guarda ni se registra. */
type AltaCreada = { nombre: string; email: string; contrasena: string };

/** Segundo nivel del panel del centro: profes tutores, altas, dossiers y seguimiento. */
export function GestionAlumnos({ centroPedido }: { centroPedido: string | null }) {
  const usuario = useUsuario();
  const ancho = useWebAncha();
  const [seccion, setSeccion] = useState<Seccion>('personas');
  const [altaCreada, setAltaCreada] = useState<AltaCreada | null>(null);
  const { centroId, centros, datos, error, cargando, recargar, aviso, hacer } =
    usePanelCentro(centroPedido);
  const creaDossiers = !!usuario.centroId && puedeCrearDossier(usuario, usuario.centroId);
  const nuevoDossier = creaDossiers ? (
    <Boton
      texto="+ Nuevo dossier"
      onPress={() => router.push({ pathname: '/alumnos', params: { nuevo: '1' } })}
    />
  ) : null;
  const altaAlumno = datos ? (
    <TarjetaAltaAlumno
      datos={datos}
      creada={altaCreada}
      onCreada={(alta) => {
        setAltaCreada(alta);
        recargar();
      }}
      onOcultar={() => setAltaCreada(null)}
    />
  ) : null;

  return (
    <Pantalla
      titulo="Alumnos"
      subtitulo={datos?.centro.nombre ?? 'Alumnos del centro'}
      accion={ancho ? nuevoDossier : undefined}
      amplia={ancho}
      bajoCabecera>
      {ancho ? null : nuevoDossier}
      <Selector<Seccion>
        opciones={[
          { valor: 'personas', texto: 'Tutores y altas' },
          { valor: 'seguimiento', texto: 'Seguimiento de prácticas' },
        ]}
        valor={seccion}
        onCambio={setSeccion}
      />
      {seccion === 'seguimiento' ? (
        <ContenidoSeguimiento
          centroId={centroId}
          onFicha={(id) => router.push({ pathname: '/alumnos', params: { dossier: id } })}
        />
      ) : (
        <>
          {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
          {centros.error ? (
            <ErrorCarga texto={centros.error} onReintentar={centros.recargar} />
          ) : null}
          {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
          {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
          {!centroId && !cargando && !centros.error ? (
            <EstadoVacio
              titulo="Sin centro"
              texto="Elige un centro desde Inicio para gestionar sus alumnos."
            />
          ) : null}
          {datos ? (
            ancho ? (
              <View style={styles.columnas}>
                <View style={styles.principal}>
                  <Cifras datos={datos} />
                  <TarjetaAlumnos datos={datos} hacer={hacer} />
                </View>
                <View style={styles.lateral}>
                  {altaAlumno}
                  <TarjetaCuentasNuevas datos={datos} hacer={hacer} />
                </View>
              </View>
            ) : (
              <View style={styles.bloques}>
                <Cifras datos={datos} />
                {altaAlumno}
                <TarjetaCuentasNuevas datos={datos} hacer={hacer} />
                <TarjetaAlumnos datos={datos} hacer={hacer} />
              </View>
            )
          ) : null}
        </>
      )}
    </Pantalla>
  );
}

function Cifras({ datos }: { datos: PanelCentro }) {
  const sinProfe = datos.alumnos.filter((a) => !a.profeId).length;
  return (
    <View style={styles.cifras}>
      <Cifra valor={`${datos.alumnos.length}`} etiqueta="Alumnos" />
      <Cifra
        valor={`${sinProfe}`}
        etiqueta="Sin profe"
        color={sinProfe ? 'estadoPendiente' : 'text'}
      />
      <Cifra valor={`${datos.profes.length}`} etiqueta="Profes" />
      <Cifra valor={`${datos.cuentasNuevas.length}`} etiqueta="Cuentas nuevas" />
    </View>
  );
}

function TarjetaAlumnos({ datos, hacer }: { datos: PanelCentro; hacer: HacerEnCentro }) {
  const usuario = useUsuario();
  const theme = useTheme();
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
    <Tarjeta titulo={`Profe tutor de cada alumno (${datos.alumnos.length})`}>
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
          <View key={a.id} style={[styles.fila, { borderColor: theme.border }]}>
            <FilaPersona nombre={a.nombre} email={a.email} />
            <Selector
              etiqueta="Profe tutor"
              opciones={opciones}
              valor={a.profeId ?? SIN_PROFE}
              onCambio={(v) => cambiar(a, v)}
            />
          </View>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaAltaAlumno({
  datos,
  creada,
  onCreada,
  onOcultar,
}: {
  datos: PanelCentro;
  creada: AltaCreada | null;
  onCreada: (alta: AltaCreada) => void;
  onOcultar: () => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    let contrasena: string | null = null;
    try {
      contrasena = generarContrasena();
      const alumno = await darDeAltaAlumno(
        container.centros,
        usuario,
        { nombre, email, contrasena },
        datos.centro.id,
      );
      onCreada({ nombre: alumno.nombre, email: alumno.email, contrasena });
      setNombre('');
      setEmail('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido dar de alta al alumno');
      // La cuenta ya existe: sin esta contraseña el alumno no podría entrar nunca.
      if (e instanceof AltaSinIncorporarError && contrasena) {
        onCreada({ nombre: nombre.trim(), email: email.trim().toLowerCase(), contrasena });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta titulo="Dar de alta un alumno">
      <ThemedText type="small" themeColor="textSecondary">
        Crea su cuenta en {datos.centro.nombre} con una contraseña inicial que verás una sola vez.
      </ThemedText>
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <Campo
        etiqueta="Nombre y apellidos"
        value={nombre}
        onChangeText={setNombre}
        autoComplete="off"
        returnKeyType="next"
      />
      <Campo
        etiqueta="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={crear}
      />
      <Boton texto="Dar de alta" onPress={crear} cargando={guardando} />
      {creada ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.credencial,
            { borderColor: theme.primary, backgroundColor: theme.subtle },
          ]}>
          <ThemedText type="smallBold">Contraseña inicial de {creada.nombre}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {creada.email}
          </ThemedText>
          <ThemedText selectable style={styles.contrasena}>
            {creada.contrasena}
          </ThemedText>
          <ThemedText type="small">Compártela con el alumno; no se volverá a mostrar.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Podrá cambiarla en su perfil. Si le llega un correo de confirmación, tendrá que
            confirmarlo antes de entrar.
          </ThemedText>
          <Boton
            texto="Ocultar"
            variante="secundario"
            accessibilityLabel="Ocultar la contraseña"
            onPress={onOcultar}
          />
        </View>
      ) : null}
    </Tarjeta>
  );
}

function TarjetaCuentasNuevas({ datos, hacer }: { datos: PanelCentro; hacer: HacerEnCentro }) {
  const usuario = useUsuario();
  const theme = useTheme();
  return (
    <Tarjeta titulo={`Cuentas nuevas (${datos.cuentasNuevas.length})`}>
      <ThemedText type="small" themeColor="textSecondary">
        {datos.cuentasNuevas.length === 0
          ? 'No hay cuentas por añadir. Aquí aparecerían las que existan sin centro.'
          : 'Estas cuentas aún no son de ningún centro. Añádelas como alumnos del tuyo.'}
      </ThemedText>
      {datos.cuentasNuevas.map((p) => (
        <View key={p.id} style={[styles.fila, { borderColor: theme.border }]}>
          <FilaPersona nombre={p.nombre} email={p.email} />
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
        </View>
      ))}
    </Tarjeta>
  );
}

function FilaPersona({ nombre, email }: { nombre: string; email: string }) {
  return (
    <View style={styles.persona}>
      <Avatar nombre={nombre} />
      <View style={styles.flex}>
        <ThemedText type="smallBold">{nombre}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {email}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  principal: { flex: 1.7, gap: Spacing.four },
  lateral: { flex: 1, gap: Spacing.four },
  bloques: { gap: Spacing.four },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1, gap: 2 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  credencial: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.button,
    padding: Spacing.three,
  },
  contrasena: { fontFamily: Fonts.mono, fontSize: 18, lineHeight: 26 },
  fila: { gap: Spacing.three, borderWidth: 1, borderRadius: Radius.button, padding: Spacing.three },
});
