import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borrarTarea, crearTarea, listarTareas, marcarTarea } from '@/core/application/tareas';
import type { Dossier } from '@/core/domain/dossier';
import { tareaVencida, type Tarea } from '@/core/domain/tarea';
import { gestionaDossier } from '@/core/domain/usuario';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { leerFecha } from '@/ui/utils/fecha-escrita';
import { fechaCorta, hoyISO } from '@/ui/utils/fechas';

import { Cargando, ErrorCarga } from './comun';

type Aviso = { tipo: 'error' | 'ok'; texto: string } | null;

/**
 * Tareas de un dossier. El alumno las marca como hechas; su profe, el instituto y la
 * generalitat además las encargan y las borran.
 */
export function TareasDossier({ dossier, onCambio }: { dossier: Dossier; onCambio?: () => void }) {
  const usuario = useUsuario();
  const hoy = hoyISO();
  const gestiona = gestionaDossier(usuario, dossier);
  const [aviso, setAviso] = useState<Aviso>(null);
  const { datos, error, recargar } = useDatos(
    () => listarTareas(container.tareas, dossier.id),
    [dossier.id],
  );

  async function hacer(accion: () => Promise<unknown>, ok?: string): Promise<boolean> {
    setAviso(null);
    try {
      await accion();
      if (ok) setAviso({ tipo: 'ok', texto: ok });
      recargar();
      onCambio?.();
      return true;
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }

  if (!datos) {
    return error ? (
      <ErrorCarga texto={error} onReintentar={recargar} />
    ) : (
      <Cargando texto="Cargando tareas…" />
    );
  }

  const pendientes = datos.filter((t) => !t.completada).length;

  return (
    <View style={styles.contenedor}>
      <ThemedText type="small" themeColor="textSecondary">
        {datos.length === 0
          ? gestiona
            ? 'Todavía no hay tareas para este alumno.'
            : 'Tu tutor todavía no te ha encargado ninguna tarea.'
          : `${pendientes} pendiente${pendientes === 1 ? '' : 's'} de ${datos.length}`}
      </ThemedText>
      {datos.map((t) => (
        <FilaTarea
          key={t.id}
          tarea={t}
          hoy={hoy}
          onMarcar={() =>
            hacer(() => marcarTarea(container.tareas, usuario, dossier, t, !t.completada))
          }
          onBorrar={
            gestiona
              ? () =>
                  hacer(() => borrarTarea(container.tareas, usuario, dossier, t), 'Tarea borrada')
              : undefined
          }
        />
      ))}
      {aviso ? <Mensaje tipo={aviso.tipo} texto={aviso.texto} /> : null}
      {gestiona ? (
        <NuevaTarea
          onCrear={(titulo, descripcion, fechaLimite) =>
            hacer(
              () =>
                crearTarea(container.tareas, usuario, dossier, {
                  dossierId: dossier.id,
                  titulo,
                  descripcion,
                  fechaLimite,
                }),
              'Tarea encargada',
            )
          }
        />
      ) : null}
    </View>
  );
}

function FilaTarea({
  tarea,
  hoy,
  onMarcar,
  onBorrar,
}: {
  tarea: Tarea;
  hoy: string;
  onMarcar: () => void;
  onBorrar?: () => void;
}) {
  const theme = useTheme();
  const vencida = tareaVencida(tarea, hoy);
  return (
    <View style={[styles.fila, { borderColor: theme.border }]}>
      {/* Toda la fila marca la tarea: un dedo no tiene que acertar en la casilla. */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarea.completada }}
        accessibilityLabel={`${tarea.titulo}: ${tarea.completada ? 'hecha' : 'pendiente'}`}
        onPress={onMarcar}
        style={styles.marcar}>
        <View
          style={[
            styles.casilla,
            {
              borderColor: tarea.completada ? theme.primary : theme.textSecondary,
              backgroundColor: tarea.completada ? theme.primary : 'transparent',
            },
          ]}>
          {tarea.completada ? (
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              ✓
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.texto}>
          <ThemedText
            type="smallBold"
            themeColor={tarea.completada ? 'textSecondary' : 'text'}
            style={tarea.completada ? styles.tachada : undefined}>
            {tarea.titulo}
          </ThemedText>
          {tarea.descripcion && !tarea.completada ? (
            <ThemedText type="small" themeColor="textSecondary">
              {tarea.descripcion}
            </ThemedText>
          ) : null}
          {tarea.fechaLimite && !tarea.completada ? (
            vencida ? (
              <Chip texto={`Vencida: ${fechaCorta(tarea.fechaLimite)}`} color="danger" />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Para el {fechaCorta(tarea.fechaLimite)}
              </ThemedText>
            )
          ) : null}
        </View>
      </Pressable>
      {onBorrar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Borrar la tarea ${tarea.titulo}`}
          onPress={onBorrar}
          style={styles.borrar}>
          <ThemedText type="small" themeColor="danger">
            Borrar
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Plegado detrás de un botón para que la tarjeta del alumno no se haga eterna. */
function NuevaTarea({
  onCrear,
}: {
  onCrear: (
    titulo: string,
    descripcion: string | null,
    fechaLimite: string | null,
  ) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const leida = leerFecha(fecha);

  if (!abierto) {
    return (
      <Boton texto="+ Encargar una tarea" variante="secundario" onPress={() => setAbierto(true)} />
    );
  }

  async function enviar() {
    setEnviando(true);
    const ok = await onCrear(titulo, descripcion || null, leida.tipo === 'ok' ? leida.fecha : null);
    setEnviando(false);
    if (ok) {
      setTitulo('');
      setDescripcion('');
      setFecha('');
      setAbierto(false);
    }
  }

  return (
    <View style={[styles.contenedor, styles.formulario]}>
      <Campo
        etiqueta="Nueva tarea"
        placeholder="Qué tiene que hacer"
        value={titulo}
        onChangeText={setTitulo}
      />
      <Campo
        etiqueta="Descripción (opcional)"
        multiline
        value={descripcion}
        onChangeText={setDescripcion}
      />
      <Campo
        etiqueta="Fecha límite (opcional)"
        placeholder="31/10/2026"
        value={fecha}
        onChangeText={setFecha}
        autoCapitalize="none"
      />
      {leida.tipo === 'error' ? (
        <ThemedText type="small" themeColor="danger">
          {leida.motivo}
        </ThemedText>
      ) : null}
      <Boton
        texto="Encargar tarea"
        onPress={enviar}
        cargando={enviando}
        desactivado={!titulo.trim() || leida.tipo === 'error'}
      />
      <Boton texto="Cancelar" variante="secundario" onPress={() => setAbierto(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.two },
  formulario: { paddingTop: Spacing.two },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  marcar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  casilla: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderRadius: Radius.control / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: Spacing.half },
  tachada: { textDecorationLine: 'line-through' },
  borrar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
});
