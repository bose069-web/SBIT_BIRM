import { useState } from 'react';
import { View } from 'react-native';
import {
  listarClases,
  crearGrupo,
  editarGrupo,
  borrarGrupo,
  asignarAlumnosAClase,
  quitarAlumnosDeClase,
  misClases,
} from '@/core/application/clases';
import { nombreGrupo, type Grupo } from '@/core/domain/grupo';
import type { Persona } from '@/core/domain/centro';
import { DatosInvalidosError, SinPermisoError } from '@/core/domain/errores';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Campo } from '@/ui/components/campo';
import { CasillaTarea } from '@/ui/components/casilla-tarea';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { Mensaje } from '@/ui/components/mensaje';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useDatos } from '@/ui/hooks/use-datos';
import { Spacing } from '@/ui/theme/theme';
import { ErrorCarga, EsqueletoPanel } from './comun';

export function MisClases() {
  const usuario = useUsuario();
  const { datos, error, recargar } = useDatos(
    () => misClases(container.grupos, container.dossiers, usuario),
    [usuario.id],
  );
  return (
    <Tarjeta titulo="Mis clases">
      {error ? (
        <ErrorCarga texto="No se pudieron consultar tus clases." onReintentar={recargar} />
      ) : !datos ? (
        <EsqueletoPanel tarjetas={1} />
      ) : datos.length === 0 ? (
        <ThemedText>Aún no tienes alumnos tutorizados en una clase.</ThemedText>
      ) : (
        datos.map(({ grupo, alumnos }) => (
          <View key={grupo.id}>
            <ThemedText type="smallBold">{nombreGrupo(grupo)}</ThemedText>
            <ThemedText>{alumnos.map((a) => a.nombre).join(', ')}</ThemedText>
          </View>
        ))
      )}
    </Tarjeta>
  );
}

export function ClasesCentro({ centroId, alumnos }: { centroId: string; alumnos: Persona[] }) {
  const [abierto, abrir] = useState(false);
  return (
    <Tarjeta titulo="Clases del centro">
      <Boton
        texto={abierto ? 'Cerrar gestión de clases' : 'Gestionar clases'}
        variante="secundario"
        onPress={() => abrir(!abierto)}
      />
      {abierto && <GestionClases centroId={centroId} alumnos={alumnos} />}
    </Tarjeta>
  );
}

function GestionClases({ centroId, alumnos }: { centroId: string; alumnos: Persona[] }) {
  const usuario = useUsuario();
  const { datos, error, recargar, cargando } = useDatos(async () => {
    const clases = await listarClases(container.grupos, usuario, centroId);
    const reparto = await container.grupos.listarAlumnos(centroId);
    return { clases, reparto };
  }, [usuario.id, centroId]);
  const [id, elegir] = useState<string | null>(null);
  const [modo, cambiarModo] = useState<'lista' | 'crear' | 'editar' | 'borrar'>('lista');
  const [ciclo, ponerCiclo] = useState(''),
    [curso, ponerCurso] = useState(''),
    [letra, ponerLetra] = useState('');
  const [ids, seleccionar] = useState<string[]>([]);
  const [ocupado, trabajar] = useState(false);
  const [aviso, avisar] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const nombresClase = new Map(datos?.clases.map((g) => [g.id, nombreGrupo(g)]));
  const grupo = datos?.clases.find((g) => g.id === id);
  const visibles =
    datos?.reparto.filter((a) => alumnos.some((p) => p.id === a.id && p.centroId === centroId)) ??
    [];
  const asignables = visibles
    .filter((a) => ids.includes(a.id) && a.grupoId !== id)
    .map((a) => a.id);
  const retirables = visibles
    .filter((a) => ids.includes(a.id) && a.grupoId === id)
    .map((a) => a.id);
  function formulario(g?: Grupo) {
    ponerCiclo(g?.ciclo ?? '');
    ponerCurso(g ? String(g.curso) : '');
    ponerLetra(g?.letra ?? '');
    cambiarModo(g ? 'editar' : 'crear');
    avisar(null);
  }
  async function hacer(accion: () => Promise<unknown>, mensaje: string) {
    if (ocupado) return;
    trabajar(true);
    avisar(null);
    try {
      await accion();
      avisar({ tipo: 'ok', texto: mensaje });
      seleccionar([]);
      cambiarModo('lista');
      recargar();
    } catch (e) {
      avisar({
        tipo: 'error',
        texto:
          e instanceof DatosInvalidosError || e instanceof SinPermisoError
            ? e.message
            : 'No se pudo completar la operación. Comprueba el reparto y vuelve a intentarlo.',
      });
      recargar();
    } finally {
      trabajar(false);
    }
  }
  if (error)
    return <ErrorCarga texto="No se pudieron cargar las clases." onReintentar={recargar} />;
  if (!datos) return <EsqueletoPanel tarjetas={1} />;
  const bloqueado = ocupado || cargando;
  const campos = { ciclo, curso: Number(curso), letra };
  return (
    <View style={{ gap: Spacing.two }}>
      {aviso && <Mensaje {...aviso} />}
      {modo === 'crear' || modo === 'editar' ? (
        <>
          <Campo etiqueta="Ciclo" value={ciclo} onChangeText={ponerCiclo} />
          <Campo
            etiqueta="Curso (1–4)"
            keyboardType="number-pad"
            value={curso}
            onChangeText={ponerCurso}
          />
          <Campo etiqueta="Letra" value={letra} onChangeText={ponerLetra} />
          <Boton
            texto="Guardar clase"
            cargando={ocupado}
            onPress={() =>
              hacer(async () => {
                const guardada =
                  modo === 'editar' && grupo
                    ? await editarGrupo(container.grupos, usuario, grupo, campos)
                    : await crearGrupo(container.grupos, usuario, {
                        ...campos,
                        id: null,
                        centroId,
                      });
                elegir(guardada.id);
              }, 'Clase guardada')
            }
          />
          <Boton
            texto="Cancelar"
            variante="secundario"
            desactivado={ocupado}
            onPress={() => cambiarModo('lista')}
          />
        </>
      ) : modo === 'borrar' && grupo ? (
        <>
          <ThemedText>¿Borrar {nombreGrupo(grupo)}? Sus alumnos quedarán sin clase.</ThemedText>
          <Boton
            texto="Confirmar borrado"
            variante="peligro"
            cargando={ocupado}
            onPress={() =>
              hacer(async () => {
                await borrarGrupo(container.grupos, usuario, grupo);
                elegir(null);
              }, 'Clase borrada')
            }
          />
          <Boton
            texto="Cancelar"
            variante="secundario"
            desactivado={ocupado}
            onPress={() => cambiarModo('lista')}
          />
        </>
      ) : (
        <>
          <Boton texto="Crear clase" onPress={() => formulario()} desactivado={bloqueado} />
          {datos.clases.length ? (
            <Selector
              etiqueta="Elige una clase"
              opciones={datos.clases.map((g) => ({ valor: g.id, texto: nombreGrupo(g) }))}
              valor={id}
              onCambio={(valor) => {
                if (!bloqueado) {
                  elegir(valor);
                  seleccionar([]);
                  avisar(null);
                }
              }}
            />
          ) : (
            <ThemedText>Este centro aún no tiene clases.</ThemedText>
          )}
          {grupo && (
            <>
              <Boton
                texto="Editar clase"
                variante="secundario"
                desactivado={bloqueado}
                onPress={() => formulario(grupo)}
              />
              <ThemedText type="smallBold">Repartir alumnos · {nombreGrupo(grupo)}</ThemedText>
              {visibles.length === 0 && (
                <ThemedText>No hay alumnos para repartir en este centro.</ThemedText>
              )}
              {visibles.map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CasillaTarea
                    titulo={a.nombre}
                    hecha={ids.includes(a.id)}
                    desactivada={bloqueado}
                    textos={{
                      marcada: 'seleccionado',
                      sinMarcar: 'sin seleccionar',
                      pista: 'Selecciona al alumno para cambiar su clase',
                    }}
                    onPress={() =>
                      seleccionar((prev) =>
                        prev.includes(a.id) ? prev.filter((i) => i !== a.id) : [...prev, a.id],
                      )
                    }
                  />
                  <ThemedText style={{ flex: 1 }}>
                    {a.nombre} · {nombresClase.get(a.grupoId ?? '') ?? 'Sin clase'}
                  </ThemedText>
                </View>
              ))}
              <Boton
                texto={`Asignar a esta clase (${asignables.length})`}
                desactivado={bloqueado || !asignables.length}
                onPress={() =>
                  hacer(
                    () => asignarAlumnosAClase(container.grupos, usuario, grupo, asignables),
                    'Asignación guardada',
                  )
                }
              />
              <Boton
                texto={`Quitar de esta clase (${retirables.length})`}
                variante="secundario"
                desactivado={bloqueado || !retirables.length}
                onPress={() =>
                  hacer(
                    () => quitarAlumnosDeClase(container.grupos, usuario, grupo, retirables),
                    'Alumnos retirados de la clase',
                  )
                }
              />
              <Boton
                texto="Borrar clase"
                variante="peligro"
                desactivado={bloqueado}
                onPress={() => cambiarModo('borrar')}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
