import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { cambiarContrasena } from '@/core/application/auth';
import { obtenerDossierActual } from '@/core/application/dossier';
import {
  cambiarEmail,
  cambiarNombre,
  guardarDatosPersonales,
  obtenerDatosPersonales,
  obtenerMiIdentidad,
} from '@/core/application/perfil';
import type { Dossier } from '@/core/domain/dossier';
import {
  enmascararDni,
  puedeCambiarSuEmail,
  puedeCambiarSuNombre,
  type DatosPersonales,
} from '@/core/domain/perfil';
import type { Rol, Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { FilaDato } from '@/ui/components/fila-dato';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useIdioma } from '@/ui/hooks/use-idioma';
import { useSesion, useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';
import { t } from '@/ui/utils/idioma';
import { OPCIONES_IDIOMA } from '@/ui/utils/traducciones/opciones';

import { ErrorCarga, EsqueletoPanel } from './comun';

// Textos en castellano: se traducen con t() al pintarlos.
const NOMBRE_ROL: Record<Rol, string> = {
  alumno: 'Alumno',
  empresa: 'Tutor de empresa',
  profe: 'Tutor del centro',
  instituto: 'Instituto',
  generalitat: 'Generalitat',
};

const TITULO_ROL: Record<Rol, string | null> = {
  alumno: null,
  profe: 'Tutoría',
  empresa: 'Datos de empresa',
  instituto: 'Cargo en el centro',
  generalitat: null,
};

export function VistaPerfil() {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const ancho = useWebAncha();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [personales, dossier, identidad] = await Promise.all([
      obtenerDatosPersonales(container.perfil),
      usuario.rol === 'alumno' ? obtenerDossierActual(container.dossiers, hoyISO()) : null,
      // Sin el DNI el resto del perfil sigue sirviendo: se muestra como no registrado.
      obtenerMiIdentidad(container.perfil, usuario).catch(() => ({ dni: null })),
    ]);
    return { personales, dossier, dni: identidad.dni };
  }, [usuario.id]);

  const cabecera = <Cabecera usuario={usuario} dossier={datos?.dossier ?? null} ancho={ancho} />;

  if (datos) {
    return (
      <Formulario
        key={usuario.id}
        usuario={usuario}
        inicial={datos.personales}
        dni={datos.dni}
        ancho={ancho}
        cabecera={cabecera}
        sesion={
          <>
            <TarjetaContrasena />
            <Tarjeta titulo={t('Sesión')}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('Datos: {origen}', { origen: container.auth.nombre })}
              </ThemedText>
              <Boton texto={t('Cerrar sesión')} variante="peligro" onPress={salir} />
            </Tarjeta>
          </>
        }
      />
    );
  }

  return (
    <Pantalla titulo={t('Perfil')} amplia={ancho} compacta>
      {cabecera}
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={2} /> : null}
    </Pantalla>
  );
}

function Cabecera({
  usuario,
  dossier,
  ancho,
}: {
  usuario: Usuario;
  dossier: Dossier | null;
  ancho: boolean;
}) {
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
          <Chip texto={t(NOMBRE_ROL[usuario.rol])} color="primary" />
          <ThemedText type="small" themeColor="textSecondary">
            {usuario.email}
          </ThemedText>
        </View>
      </View>
      {usuario.rol === 'alumno' ? (
        <View style={[styles.practicas, { borderTopColor: theme.border }]}>
          <View style={[styles.datoPracticas, ancho && styles.datoPracticasAncho]}>
            <FilaDato vertical etiqueta={t('Ciclo')} valor={dossier?.ciclo ?? t('Sin asignar')} />
          </View>
          <View style={[styles.datoPracticas, ancho && styles.datoPracticasAncho]}>
            <FilaDato vertical etiqueta={t('Centro')} valor={dossier?.centro ?? t('Sin asignar')} />
          </View>
          <View style={[styles.datoPracticas, ancho && styles.datoPracticasAncho]}>
            <FilaDato
              vertical
              etiqueta={t('Empresa')}
              valor={dossier?.empresa ?? t('Sin asignar')}
            />
          </View>
          <View style={[styles.datoPracticas, ancho && styles.datoPracticasAncho]}>
            <FilaDato
              vertical
              etiqueta={t('Periodo')}
              valor={
                dossier
                  ? `${fechaCorta(dossier.fechaInicio)} – ${fechaCorta(dossier.fechaFin)}`
                  : t('Sin asignar')
              }
            />
          </View>
        </View>
      ) : null}
    </Tarjeta>
  );
}

function Formulario({
  usuario,
  inicial,
  dni,
  ancho,
  cabecera,
  sesion,
}: {
  usuario: Usuario;
  inicial: DatosPersonales;
  dni: string | null;
  ancho: boolean;
  cabecera: ReactNode;
  sesion: ReactNode;
}) {
  const theme = useTheme();
  const { renombrar, cambiarCorreo } = useSesion();
  const { idioma, cambiarIdioma } = useIdioma();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [datos, setDatos] = useState(inicial);
  const [email, setEmail] = useState(usuario.email);
  const [guardado, setGuardado] = useState({
    nombre: usuario.nombre,
    datos: inicial,
    email: usuario.email,
  });
  const editaNombre = puedeCambiarSuNombre(usuario.rol);
  const editaEmail = puedeCambiarSuEmail(usuario.rol);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const hayCambios =
    (editaNombre && nombre !== guardado.nombre) ||
    (editaEmail && email.trim().toLowerCase() !== guardado.email.toLowerCase()) ||
    (Object.keys(datos) as (keyof DatosPersonales)[]).some(
      (campo) => (datos[campo] ?? '') !== (guardado.datos[campo] ?? ''),
    );

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
      let nombreGuardado = usuario.nombre;
      if (editaNombre && nombre.trim() !== usuario.nombre) {
        nombreGuardado = await cambiarNombre(container.perfil, usuario, nombre);
        renombrar(nombreGuardado);
      }
      let mensaje = t('Cambios guardados');
      let emailGuardado = guardado.email;
      // El correo solo se pide si ha cambiado de verdad.
      if (editaEmail && email.trim().toLowerCase() !== guardado.email.toLowerCase()) {
        const cambio = await cambiarEmail(container.perfil, usuario, email);
        emailGuardado = cambio.email;
        setEmail(cambio.email);
        if (cambio.estado === 'cambiado') {
          cambiarCorreo(cambio.email);
          mensaje = t('Correo actualizado');
        } else {
          mensaje = t(
            'Te hemos enviado un enlace a {email} para confirmar el cambio. Hasta que lo confirmes, entra con el de siempre.',
            { email: cambio.email },
          );
        }
      }
      setDatos(guardados);
      setNombre(nombreGuardado);
      setGuardado({ nombre: nombreGuardado, datos: guardados, email: emailGuardado });
      setAviso({ tipo: 'ok', texto: mensaje });
      // Con el idioma nuevo se vuelve a pintar toda la app.
      if (guardados.idioma !== idioma) cambiarIdioma(guardados.idioma);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? t(e.message) : t('No se pudo guardar'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const tituloRol = TITULO_ROL[usuario.rol];

  // Datos de identidad: solo consulta, con una única nota sobre quién los gestiona.
  const cuenta = (
    <Tarjeta titulo={t('Cuenta')}>
      {!editaNombre ? (
        <FilaDato vertical={!ancho} etiqueta={t('Nombre y apellidos')} valor={usuario.nombre} />
      ) : null}
      {editaEmail ? (
        <Campo
          etiqueta={t('Correo')}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setAviso(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          ayuda={t(
            'Es tu correo para entrar: aquí lo cambias tú. Te pediremos confirmarlo desde el buzón.',
          )}
        />
      ) : (
        <FilaDato vertical={!ancho} etiqueta={t('Correo')} valor={usuario.email} />
      )}
      {usuario.rol === 'alumno' ? <FilaDni dni={dni} vertical={!ancho} /> : null}
      {/* La empresa gestiona su propia cuenta; al resto se la gestiona su centro. */}
      {editaEmail ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {t('Estos datos los gestiona tu centro. Si alguno está mal, avisa a tu tutor.')}
        </ThemedText>
      )}
      {usuario.rol === 'alumno' ? (
        <Boton
          texto={t('Avisar a mi tutor')}
          variante="secundario"
          onPress={() => router.push('/chat')}
          accessibilityHint={t('Abre el chat para comunicar una incidencia')}
        />
      ) : null}
    </Tarjeta>
  );

  const contacto = (
    <Tarjeta titulo={t('Contacto')}>
      {editaNombre ? (
        <Campo
          etiqueta={t('Nombre y apellidos')}
          value={nombre}
          onChangeText={(v) => {
            setNombre(v);
            setAviso(null);
          }}
          autoComplete="name"
        />
      ) : null}
      <Campo
        etiqueta={t('Teléfono')}
        value={texto('telefono')}
        onChangeText={(v) => cambiar('telefono', v)}
        placeholder="600 123 456"
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      {usuario.rol === 'alumno' ? (
        <View style={[styles.emergencia, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold">{t('En caso de emergencia')}</ThemedText>
          <Campo
            etiqueta={t('Nombre del contacto')}
            value={texto('emergenciaNombre')}
            onChangeText={(v) => cambiar('emergenciaNombre', v)}
            placeholder={t('Madre, padre, tutor legal…')}
          />
          <Campo
            etiqueta={t('Teléfono del contacto')}
            value={texto('emergenciaTelefono')}
            onChangeText={(v) => cambiar('emergenciaTelefono', v)}
            keyboardType="phone-pad"
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('Pendiente de validar por tu tutor')}
          </ThemedText>
        </View>
      ) : null}
    </Tarjeta>
  );

  const tarjetaRol = tituloRol ? (
    <Tarjeta titulo={t(tituloRol)}>
      {usuario.rol === 'profe' ? (
        <>
          <Campo
            etiqueta={t('Departamento')}
            value={texto('departamento')}
            onChangeText={(v) => cambiar('departamento', v)}
            placeholder={t('Informática')}
          />
          <Campo
            etiqueta={t('Horario de tutoría')}
            value={texto('horarioTutoria')}
            onChangeText={(v) => cambiar('horarioTutoria', v)}
            placeholder={t('Martes de 15:00 a 16:00')}
          />
        </>
      ) : null}
      {usuario.rol === 'empresa' || usuario.rol === 'instituto' ? (
        <Campo
          etiqueta={t('Cargo')}
          value={texto('cargo')}
          onChangeText={(v) => cambiar('cargo', v)}
          placeholder={
            usuario.rol === 'empresa' ? t('Responsable de desarrollo') : t('Coordinación FCT')
          }
        />
      ) : null}
      {usuario.rol === 'empresa' ? (
        <>
          <Campo
            etiqueta={t('Teléfono de trabajo')}
            value={texto('telefonoTrabajo')}
            onChangeText={(v) => cambiar('telefonoTrabajo', v)}
            keyboardType="phone-pad"
          />
          <Campo
            etiqueta={t('Centro de trabajo')}
            value={texto('centroTrabajo')}
            onChangeText={(v) => cambiar('centroTrabajo', v)}
            placeholder={t('Oficina de Barcelona')}
          />
        </>
      ) : null}
    </Tarjeta>
  ) : null;

  const preferencias = (
    <Tarjeta titulo={t('Preferencias')}>
      <Selector
        etiqueta={t('Idioma')}
        opciones={OPCIONES_IDIOMA}
        valor={datos.idioma}
        onCambio={(v) => cambiar('idioma', v)}
      />
      <Interruptor
        texto={t('Avisos y notificaciones')}
        valor={datos.notificaciones}
        onCambio={(v) => cambiar('notificaciones', v)}
      />
    </Tarjeta>
  );

  const barra = hayCambios ? (
    <View style={styles.barraGuardado}>
      <View style={styles.estadoGuardado}>
        {aviso ? (
          <Mensaje tipo={aviso.tipo} texto={aviso.texto} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
            {t('Tienes cambios sin guardar')}
          </ThemedText>
        )}
      </View>
      <Boton texto={t('Guardar cambios')} onPress={guardar} cargando={guardando} />
    </View>
  ) : null;

  // Web ancha: lo editable a la izquierda (contacto y rol en paralelo) y la cuenta a la derecha.
  return (
    <Pantalla titulo={t('Perfil')} amplia={ancho} compacta pie={barra}>
      {cabecera}
      {!hayCambios && aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {ancho ? (
        <View style={styles.columnas}>
          <View style={[styles.columna, styles.principal]}>
            <View style={styles.pareja}>
              <View style={styles.mitad}>{contacto}</View>
              {tarjetaRol ? <View style={styles.mitad}>{tarjetaRol}</View> : null}
            </View>
            {preferencias}
          </View>
          <View style={[styles.columna, styles.lateral]}>
            {cuenta}
            {sesion}
          </View>
        </View>
      ) : (
        <>
          {cuenta}
          {contacto}
          {tarjetaRol}
          {preferencias}
          {sesion}
        </>
      )}
    </Pantalla>
  );
}

function TarjetaContrasena() {
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const guardar = async () => {
    if (guardando) return;
    if (nueva !== repetida) {
      setAviso({ tipo: 'error', texto: t('Las dos contraseñas no coinciden') });
      return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      await cambiarContrasena(container.auth, nueva);
      setNueva('');
      setRepetida('');
      setAviso({ tipo: 'ok', texto: t('Contraseña cambiada') });
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? t(e.message) : t('No se pudo cambiar'),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Tarjeta titulo={t('Contraseña')}>
      <Campo
        etiqueta={t('Contraseña nueva')}
        value={nueva}
        onChangeText={setNueva}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        ayuda={t('Al menos 8 caracteres.')}
      />
      <Campo
        etiqueta={t('Repite la contraseña')}
        value={repetida}
        onChangeText={setRepetida}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        onSubmitEditing={guardar}
      />
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <Boton
        texto={t('Cambiar contraseña')}
        variante="secundario"
        onPress={guardar}
        cargando={guardando}
      />
    </Tarjeta>
  );
}

/** DNI enmascarado por defecto; el alumno puede mostrarlo pero nunca editarlo. */
function FilaDni({ dni, vertical }: { dni: string | null; vertical: boolean }) {
  const [visible, setVisible] = useState(false);
  if (!dni) return <FilaDato vertical={vertical} etiqueta="DNI" valor={t('Sin registrar')} />;
  return (
    <View style={styles.filaDni}>
      <View style={styles.flex}>
        <FilaDato vertical={vertical} etiqueta="DNI" valor={visible ? dni : enmascararDni(dni)} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? t('Ocultar DNI') : t('Mostrar DNI')}
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.botonDni, pressed && styles.pulsado]}>
        <ThemedText type="smallBold" themeColor="primary">
          {visible ? t('Ocultar') : t('Mostrar')}
        </ThemedText>
      </Pressable>
    </View>
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
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={texto}
      accessibilityState={{ checked: valor }}
      aria-checked={valor}
      onPress={() => onCambio(!valor)}
      onKeyDown={
        Platform.OS === 'web'
          ? (evento) => {
              // Pressable maneja Intro; el rol switch también debe responder a Espacio.
              if (evento.nativeEvent.key === ' ') {
                evento.preventDefault();
                if (!evento.nativeEvent.repeat) onCambio(!valor);
              }
            }
          : undefined
      }
      style={styles.interruptor}>
      <ThemedText type="small" style={styles.flex}>
        {texto}
      </ThemedText>
      {/* Toda la fila es pulsable; el control interior solo representa el estado. */}
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.areaInterruptor}>
        <Switch
          value={valor}
          trackColor={{ true: theme.primary, false: theme.borderStrong }}
          thumbColor={valor ? theme.onPrimary : theme.surface}
          ios_backgroundColor={theme.borderStrong}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  practicas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  datoPracticas: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  datoPracticasAncho: { flexBasis: 0 },
  emergencia: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0, gap: Spacing.two },
  areaInterruptor: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  barraGuardado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  estadoGuardado: { flex: 1, minWidth: 0 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  columna: { minWidth: 0, gap: Spacing.three },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.7 },
  lateral: { flex: 1, maxWidth: 380 },
  pareja: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Spacing.three },
  mitad: { flexGrow: 1, flexBasis: 280, minWidth: 0 },
  filaDni: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  botonDni: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  pulsado: { opacity: 0.6 },
});
