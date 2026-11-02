import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { administraCentro } from '@/core/application/centro';
import {
  borrarDossier,
  guardarDossier,
  listarTutoresEmpresa,
  obtenerOpcionesDossier,
} from '@/core/application/dossier';
import {
  validarValoresDossier,
  type Dossier,
  type ValoresFormularioDossier,
} from '@/core/domain/dossier';
import { container } from '@/config/container';
import { AvisoBorrador } from '@/ui/components/aviso-borrador';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Mensaje } from '@/ui/components/mensaje';
import { Pantalla } from '@/ui/components/pantalla';
import { Buscador } from '@/ui/components/buscador';
import { fechaCorta } from '@/ui/utils/fechas';
import { SelectorFecha } from '@/ui/components/selector-fecha';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useBorrador } from '@/ui/hooks/use-borrador';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';

import { ErrorCarga, EsqueletoPanel } from './comun';

interface Actividad {
  /** Clave local para la lista; `id` es el de la base (null si es nueva). */
  clave: string;
  id: string | null;
  descripcion: string;
}

let siguienteClave = 0;
const nuevaActividad = (descripcion = ''): Actividad => ({
  clave: `n${siguienteClave++}`,
  id: null,
  descripcion,
});

/**
 * Crear (sin `dossierId`) o editar un dossier con sus actividades formativas. Lo usan el profe
 * tutor y el instituto de su centro; la base vuelve a comprobar los permisos al guardar.
 */
export function FormularioDossier({
  dossierId,
  onTerminar,
}: {
  dossierId?: string;
  onTerminar: (dossierId: string | null) => void;
}) {
  const usuario = useUsuario();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const actual = dossierId ? await container.dossiers.obtener(dossierId) : null;
    const centroId = actual?.centroId ?? usuario.centroId;
    if (!centroId) throw new Error('Tu cuenta no tiene centro: no puedes crear dossiers.');
    const opciones = await obtenerOpcionesDossier(container.centros, usuario, centroId);
    return { actual, centroId, opciones };
  }, [dossierId]);

  const titulo = dossierId ? 'Editar dossier' : 'Nuevo dossier';
  if (!datos) {
    return (
      <Pantalla titulo={titulo}>
        <Boton texto="‹ Volver" variante="secundario" onPress={() => onTerminar(null)} />
        {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
        {cargando ? <EsqueletoPanel tarjetas={2} /> : null}
      </Pantalla>
    );
  }
  return (
    <Formulario
      titulo={titulo}
      actual={datos.actual}
      centroId={datos.centroId}
      opciones={datos.opciones}
      onTerminar={onTerminar}
    />
  );
}

function Formulario({
  titulo,
  actual,
  centroId,
  opciones,
  onTerminar,
}: {
  titulo: string;
  actual: Dossier | null;
  centroId: string;
  opciones: Awaited<ReturnType<typeof obtenerOpcionesDossier>>;
  onTerminar: (dossierId: string | null) => void;
}) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [alumnoId, setAlumnoId] = useState(actual?.alumnoId ?? '');
  const [empresaId, setEmpresaId] = useState(actual?.empresaId ?? '');
  const [tutorEmpresaId, setTutorEmpresaId] = useState<string | null>(
    actual?.tutorEmpresaId ?? null,
  );
  const [ciclo, setCiclo] = useState(actual?.ciclo ?? '');
  const [fechaInicio, setFechaInicio] = useState(actual?.fechaInicio ?? '');
  const [fechaFin, setFechaFin] = useState(actual?.fechaFin ?? '');
  const [horas, setHoras] = useState(actual ? String(actual.horasTotales) : '');
  const [actividades, setActividades] = useState<Actividad[]>(() =>
    actual
      ? actual.actividades.map((a) => ({ clave: a.id, id: a.id, descripcion: a.descripcion }))
      : [nuevaActividad()],
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Sin datos personales del alumno: solo su id, el ciclo, las fechas y las actividades.
  const [base] = useState<ValoresFormularioDossier>(() => ({
    alumnoId: actual?.alumnoId ?? '',
    empresaId: actual?.empresaId ?? '',
    tutorEmpresaId: actual?.tutorEmpresaId ?? null,
    ciclo: actual?.ciclo ?? '',
    fechaInicio: actual?.fechaInicio ?? '',
    fechaFin: actual?.fechaFin ?? '',
    horas: actual ? String(actual.horasTotales) : '',
    actividades: actual
      ? actual.actividades.map(({ id, descripcion }) => ({ id, descripcion }))
      : [{ id: null, descripcion: '' }],
  }));

  function aplicar(v: ValoresFormularioDossier) {
    setAlumnoId(v.alumnoId);
    setEmpresaId(v.empresaId);
    setTutorEmpresaId(v.tutorEmpresaId);
    setCiclo(v.ciclo);
    setFechaInicio(v.fechaInicio);
    setFechaFin(v.fechaFin);
    setHoras(v.horas);
    setActividades(v.actividades.map((a) => ({ ...a, clave: a.id ?? nuevaActividad().clave })));
  }

  const borrador = useBorrador<ValoresFormularioDossier>({
    clave: {
      ambito: 'dossier',
      usuarioId: usuario.id,
      contexto: [actual?.id ?? `nuevo-${centroId}`],
    },
    valores: {
      alumnoId,
      empresaId,
      tutorEmpresaId,
      ciclo,
      fechaInicio,
      fechaFin,
      horas,
      actividades: actividades.map(({ id, descripcion }) => ({ id, descripcion })),
    },
    base,
    iguales: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    validar: validarValoresDossier,
    onRecuperar: aplicar,
  });

  const tutores = useDatos(
    async () => (empresaId ? listarTutoresEmpresa(container.centros, empresaId) : []),
    [empresaId],
  );

  // Al editar, el alumno no se puede cambiar: solo se muestra el suyo.
  const alumnos = actual
    ? [{ valor: actual.alumnoId, texto: actual.alumnoNombre }]
    : opciones.alumnos.map((a) => ({ valor: a.id, texto: a.nombre, detalle: a.email }));

  function cambiarActividad(clave: string, descripcion: string) {
    setActividades((lista) => lista.map((a) => (a.clave === clave ? { ...a, descripcion } : a)));
  }

  async function guardar() {
    setAviso(null);
    setGuardando(true);
    try {
      const guardado = await guardarDossier(
        container.dossiers,
        container.registros,
        usuario,
        {
          id: actual?.id ?? null,
          alumnoId,
          centroId,
          empresaId,
          tutorEmpresaId,
          ciclo,
          fechaInicio,
          fechaFin,
          horasTotales: Number(horas),
          actividades: actividades.map(({ id, descripcion }) => ({ id, descripcion })),
        },
        actual,
      );
      await borrador.descartar();
      onTerminar(guardado.id);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!actual) return;
    setAviso(null);
    setGuardando(true);
    try {
      await borrarDossier(container.dossiers, container.registros, usuario, actual);
      await borrador.descartar();
      onTerminar(null);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      setGuardando(false);
    }
  }

  return (
    <Pantalla titulo={titulo} subtitulo={actual?.alumnoNombre}>
      <Boton
        texto="‹ Volver sin guardar"
        variante="secundario"
        onPress={() => onTerminar(actual?.id ?? null)}
      />

      <Tarjeta titulo="Alumno y empresa">
        {alumnos.length ? (
          <Buscador
            etiqueta="Alumno"
            placeholder="Escribe el nombre o el correo"
            opciones={alumnos}
            valor={alumnoId}
            onCambio={setAlumnoId}
            fijo={!!actual}
          />
        ) : (
          <Mensaje tipo="error" texto="No hay alumnos con profe asignado en tu centro." />
        )}
        {!actual && opciones.alumnosSinProfe.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            Sin profe asignado (asígnalo antes en Centro):{' '}
            {opciones.alumnosSinProfe.map((a) => a.nombre).join(', ')}
          </ThemedText>
        ) : null}
        {opciones.convenios.length ? (
          <Buscador
            etiqueta="Empresa (con convenio)"
            placeholder="Escribe el nombre de la empresa"
            opciones={opciones.convenios.map((c) => ({
              valor: c.empresaId,
              texto: c.empresaNombre,
              detalle: c.firmadoEn ? `Convenio desde ${fechaCorta(c.firmadoEn)}` : undefined,
            }))}
            valor={empresaId}
            onCambio={(id) => {
              setEmpresaId(id);
              setTutorEmpresaId(null);
            }}
          />
        ) : (
          <Mensaje tipo="error" texto="Tu centro todavía no tiene convenios con empresas." />
        )}
        {empresaId ? (
          tutores.datos?.length ? (
            <Selector
              etiqueta="Tutor de empresa"
              opciones={tutores.datos.map((t) => ({ valor: t.id, texto: t.nombre }))}
              valor={tutorEmpresaId}
              onCambio={setTutorEmpresaId}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {tutores.cargando
                ? 'Buscando tutores…'
                : 'Esta empresa aún no tiene tutor en Kampus: se puede asignar más tarde.'}
            </ThemedText>
          )
        ) : null}
      </Tarjeta>

      <Tarjeta titulo="Prácticas">
        <Campo etiqueta="Ciclo" placeholder="DAM" value={ciclo} onChangeText={setCiclo} />
        <SelectorFecha etiqueta="Inicio" valor={fechaInicio} onCambio={setFechaInicio} />
        <SelectorFecha etiqueta="Fin" valor={fechaFin} onCambio={setFechaFin} />
        <Campo
          etiqueta="Horas totales"
          placeholder="400"
          keyboardType="number-pad"
          value={horas}
          onChangeText={(t) => setHoras(t.replace(/\D/g, ''))}
        />
      </Tarjeta>

      <Tarjeta titulo="Actividades formativas">
        <ThemedText type="small" themeColor="textSecondary">
          El alumno reparte sus horas entre estas actividades. Las que ya tienen horas no se pueden
          quitar.
        </ThemedText>
        {actividades.map((a, i) => (
          <View key={a.clave} style={styles.actividad}>
            <View style={styles.campoActividad}>
              <Campo
                etiqueta={`Actividad ${i + 1}`}
                placeholder="Desarrollo de la app interna"
                value={a.descripcion}
                onChangeText={(t) => cambiarActividad(a.clave, t)}
              />
            </View>
            {actividades.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar la actividad ${i + 1}`}
                onPress={() => setActividades((l) => l.filter((x) => x.clave !== a.clave))}
                style={({ pressed }) => [
                  styles.quitar,
                  { backgroundColor: pressed ? theme.border : theme.subtle },
                ]}>
                <ThemedText type="smallBold" themeColor="danger">
                  ✕
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Boton
          texto="+ Añadir actividad"
          variante="secundario"
          onPress={() => setActividades((l) => [...l, nuevaActividad()])}
        />
      </Tarjeta>

      <AvisoBorrador
        guardadoEn={borrador.guardadoEn}
        fallo={borrador.fallo}
        onDescartar={() => {
          void borrador.descartar();
          aplicar(base);
        }}
      />
      {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
      <Boton
        texto={actual ? 'Guardar cambios' : 'Crear dossier'}
        onPress={guardar}
        cargando={guardando}
        desactivado={
          !alumnoId || !empresaId || !ciclo.trim() || !fechaInicio || !fechaFin || !horas
        }
      />
      {actual && administraCentro(usuario, actual.centroId) ? (
        <Boton texto="Borrar dossier" variante="peligro" onPress={borrar} desactivado={guardando} />
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  actividad: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  campoActividad: { flex: 1 },
  quitar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
