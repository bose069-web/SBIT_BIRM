import { useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { obtenerDossierActual } from '@/core/application/dossier';
import {
  cambiarNombre,
  guardarDatosPersonales,
  obtenerDatosPersonales,
} from '@/core/application/perfil';
import type { Dossier } from '@/core/domain/dossier';
import { puedeCambiarSuNombre, type DatosPersonales, type Idioma } from '@/core/domain/perfil';
import type { Rol, Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useSesion, useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { ErrorCarga, EsqueletoPanel } from './comun';

const NOMBRE_ROL: Record<Rol, string> = {
  alumno: 'Alumno',
  empresa: 'Tutor de empresa',
  profe: 'Tutor del centro',
  instituto: 'Instituto',
  generalitat: 'Generalitat',
};

const TITULO_ROL: Record<Rol, string | null> = {
  alumno: 'Contacto de emergencia',
  profe: 'Tutoría',
  empresa: 'Datos de empresa',
  instituto: 'Cargo en el centro',
  generalitat: null,
};

const IDIOMAS: { valor: Idioma; texto: string }[] = [
  { valor: 'es', texto: 'Castellano' },
  { valor: 'ca', texto: 'Català' },
];

export function VistaPerfil() {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const ancho = useWebAncha();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [personales, dossier] = await Promise.all([
      obtenerDatosPersonales(container.perfil),
      usuario.rol === 'alumno' ? obtenerDossierActual(container.dossiers, hoyISO()) : null,
    ]);
    return { personales, dossier };
  }, [usuario.id]);

  return (
    <Pantalla titulo="Perfil" amplia={ancho} compacta>
      <Cabecera usuario={usuario} dossier={datos?.dossier ?? null} />
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
      {datos ? (
        <Columnas
          ancho={ancho}
          izquierda={<Formulario usuario={usuario} inicial={datos.personales} />}
          derecha={
            <>
              <Tarjeta titulo="App">
                <ThemedText type="small" themeColor="textSecondary">
                  Datos: {container.auth.nombre}
                </ThemedText>
              </Tarjeta>
              <Boton texto="Cerrar sesión" variante="peligro" onPress={salir} />
            </>
          }
        />
      ) : null}
    </Pantalla>
  );
}

function Cabecera({ usuario, dossier }: { usuario: Usuario; dossier: Dossier | null }) {
  const theme = useTheme();
  const iniciales = usuario.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <Tarjeta>
      <View style={styles.cabecera}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText type="subtitle" style={{ color: theme.onPrimary }}>
            {iniciales}
          </ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="subtitle">{usuario.nombre}</ThemedText>
          <ThemedText themeColor="textSecondary">{usuario.email}</ThemedText>
          <ThemedText type="smallBold">{NOMBRE_ROL[usuario.rol]}</ThemedText>
        </View>
      </View>
      {/* Lo asigna el centro: aquí solo se consulta. */}
      {dossier ? (
        <ThemedText type="small" themeColor="textSecondary">
          {dossier.ciclo} · {dossier.centro ?? 'Sin centro'} · {dossier.empresa ?? 'Sin empresa'}
          {'\n'}Prácticas del {fechaCorta(dossier.fechaInicio)} al {fechaCorta(dossier.fechaFin)}
        </ThemedText>
      ) : null}
    </Tarjeta>
  );
}

function Formulario({ usuario, inicial }: { usuario: Usuario; inicial: DatosPersonales }) {
  const { renombrar } = useSesion();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [datos, setDatos] = useState(inicial);
  const editaNombre = puedeCambiarSuNombre(usuario.rol);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cambiar = <K extends keyof DatosPersonales>(campo: K, valor: DatosPersonales[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setAviso(null);
  };
  const texto = (campo: keyof DatosPersonales) => {
    const valor = datos[campo];
    return typeof valor === 'string' ? valor : '';
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const guardados = await guardarDatosPersonales(container.perfil, usuario, datos);
      if (editaNombre && nombre.trim() !== usuario.nombre) {
        renombrar(await cambiarNombre(container.perfil, usuario, nombre));
      }
      setDatos(guardados);
      setAviso({ tipo: 'ok', texto: 'Cambios guardados' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  };

  const tituloRol = TITULO_ROL[usuario.rol];
  return (
    <>
      <Tarjeta titulo="Datos personales">
        <Campo
          etiqueta="Nombre y apellidos"
          value={nombre}
          onChangeText={(v) => {
            setNombre(v);
            setAviso(null);
          }}
          autoComplete="name"
          editable={editaNombre}
          ayuda={editaNombre ? undefined : 'Lo gestiona tu tutor: pídeselo si hay un error.'}
        />
        <Campo
          etiqueta="Correo"
          value={usuario.email}
          editable={false}
          ayuda="Es tu usuario para entrar; lo cambia tu centro."
        />
        <Campo
          etiqueta="Teléfono"
          value={texto('telefono')}
          onChangeText={(v) => cambiar('telefono', v)}
          placeholder="600 123 456"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </Tarjeta>

      {tituloRol ? (
        <Tarjeta titulo={tituloRol}>
          {usuario.rol === 'alumno' ? (
            <>
              <Campo
                etiqueta="Nombre del contacto"
                value={texto('emergenciaNombre')}
                onChangeText={(v) => cambiar('emergenciaNombre', v)}
                placeholder="Madre, padre, tutor legal…"
              />
              <Campo
                etiqueta="Teléfono del contacto"
                value={texto('emergenciaTelefono')}
                onChangeText={(v) => cambiar('emergenciaTelefono', v)}
                keyboardType="phone-pad"
              />
            </>
          ) : null}
          {usuario.rol === 'profe' ? (
            <>
              <Campo
                etiqueta="Departamento"
                value={texto('departamento')}
                onChangeText={(v) => cambiar('departamento', v)}
                placeholder="Informática"
              />
              <Campo
                etiqueta="Horario de tutoría"
                value={texto('horarioTutoria')}
                onChangeText={(v) => cambiar('horarioTutoria', v)}
                placeholder="Martes de 15:00 a 16:00"
              />
            </>
          ) : null}
          {usuario.rol === 'empresa' || usuario.rol === 'instituto' ? (
            <Campo
              etiqueta="Cargo"
              value={texto('cargo')}
              onChangeText={(v) => cambiar('cargo', v)}
              placeholder={
                usuario.rol === 'empresa' ? 'Responsable de desarrollo' : 'Coordinación FCT'
              }
            />
          ) : null}
          {usuario.rol === 'empresa' ? (
            <>
              <Campo
                etiqueta="Teléfono de trabajo"
                value={texto('telefonoTrabajo')}
                onChangeText={(v) => cambiar('telefonoTrabajo', v)}
                keyboardType="phone-pad"
              />
              <Campo
                etiqueta="Centro de trabajo"
                value={texto('centroTrabajo')}
                onChangeText={(v) => cambiar('centroTrabajo', v)}
                placeholder="Oficina de Barcelona"
              />
            </>
          ) : null}
        </Tarjeta>
      ) : null}

      <Tarjeta titulo="Preferencias">
        <Selector
          etiqueta="Idioma"
          opciones={IDIOMAS}
          valor={datos.idioma}
          onCambio={(v) => cambiar('idioma', v)}
        />
        <Interruptor
          texto="Avisos y notificaciones"
          valor={datos.notificaciones}
          onCambio={(v) => cambiar('notificaciones', v)}
        />
      </Tarjeta>

      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <Boton texto="Guardar cambios" onPress={guardar} cargando={guardando} />
    </>
  );
}

function Interruptor({
  texto,
  valor,
  onCambio,
}: {
  texto: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.interruptor}>
      <ThemedText type="small" style={styles.flex}>
        {texto}
      </ThemedText>
      <Switch
        accessibilityLabel={texto}
        value={valor}
        onValueChange={onCambio}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

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
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: Spacing.one },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
});
