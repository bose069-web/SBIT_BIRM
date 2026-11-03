import { useState } from 'react';
import { View } from 'react-native';
import { obtenerRepartoProfes, reasignarAlumnos } from '@/core/application/profes-instituto';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { CasillaTarea } from '@/ui/components/casilla-tarea';
import { Mensaje } from '@/ui/components/mensaje';
import { Selector } from '@/ui/components/selector';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { Spacing } from '@/ui/theme/theme';
import { t } from '@/ui/utils/idioma';
import { ErrorCarga, EsqueletoPanel } from './comun';

export function RepartoProfesCentro({
  centroId,
  onCambio,
}: {
  centroId: string;
  onCambio: () => void;
}) {
  const usuario = useUsuario();
  const { datos, error, recargar, cargando } = useDatos(
    () => obtenerRepartoProfes(container.centros, usuario, centroId),
    [centroId, usuario.id],
  );
  const [ids, seleccionar] = useState<string[]>([]);
  const [destino, elegir] = useState<string | null>(null);
  const [revisando, revisar] = useState(false);
  const [guardando, guardar] = useState(false);
  const [aviso, avisar] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  if (error) return <ErrorCarga texto={error} onReintentar={recargar} />;
  if (!datos) return <EsqueletoPanel />;
  const grupos = [
    { id: 'sin-tutor', nombre: t('Sin tutor'), alumnos: datos.sinProfe },
    ...datos.profes,
  ];
  const profe = datos.profes.find((p) => p.id === destino) ?? null;
  const alumnos = grupos
    .flatMap((g) => g.alumnos)
    .filter((a) => ids.includes(a.id) && a.profeId !== (profe?.id ?? null));
  async function aplicar() {
    if (!revisando || guardando || !destino || !alumnos.length) return;
    guardar(true);
    try {
      const total = await reasignarAlumnos(container.centros, usuario, alumnos, profe);
      avisar({
        tipo: 'ok',
        texto: t('Reasignación completada. Alumnos actualizados: {n}.', { n: total }),
      });
      seleccionar([]);
      elegir(null);
      onCambio();
    } catch {
      avisar({
        tipo: 'error',
        texto:
          'No se pudo completar la reasignación. Comprueba el reparto actualizado antes de reintentarlo.',
      });
    } finally {
      guardar(false);
      revisar(false);
      recargar();
    }
  }
  return (
    <Tarjeta titulo={t('Reparto por profesor')}>
      {aviso && <Mensaje {...aviso} />}
      {revisando ? (
        <>
          <ThemedText type="smallBold">
            {profe ? t('Asignar a {nombre}', { nombre: profe.nombre }) : t('Dejar sin tutor')}
          </ThemedText>
          <ThemedText>{alumnos.map((a) => a.nombre).join(', ')}</ThemedText>
          <Boton texto={t('Confirmar reasignación')} onPress={aplicar} cargando={guardando} />
          <Boton
            texto={t('Volver a la selección')}
            variante="secundario"
            onPress={() => revisar(false)}
            desactivado={guardando}
          />
        </>
      ) : (
        <>
          <Selector
            etiqueta={t('Tutor de destino')}
            valor={destino}
            opciones={grupos.map((g) => ({ valor: g.id, texto: g.nombre }))}
            onCambio={elegir}
          />
          <Boton
            texto={t('Revisar reasignación ({n})', { n: destino ? alumnos.length : 0 })}
            desactivado={!destino || !alumnos.length || cargando}
            onPress={() => {
              avisar(null);
              revisar(true);
            }}
          />
          {grupos.every((g) => g.alumnos.length === 0) ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('Todavía no hay alumnos en el centro.')}
            </ThemedText>
          ) : null}
          {datos.profes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('Todavía no hay profes en el centro.')}
            </ThemedText>
          ) : null}
          {grupos.map((g) => (
            <View key={g.id} style={{ gap: Spacing.one }}>
              <ThemedText type="smallBold">
                {g.nombre} ({g.alumnos.length})
              </ThemedText>
              {g.alumnos.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('Sin alumnos asignados')}
                </ThemedText>
              ) : null}
              {g.alumnos.map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CasillaTarea
                    titulo={a.nombre}
                    hecha={ids.includes(a.id)}
                    textos={{
                      marcada: t('seleccionado'),
                      sinMarcar: t('sin seleccionar'),
                      pista: t('Selecciona al alumno para reasignarlo'),
                    }}
                    onPress={() =>
                      seleccionar((prev) =>
                        prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                      )
                    }
                  />
                  <ThemedText style={{ flex: 1 }}>{a.nombre}</ThemedText>
                </View>
              ))}
            </View>
          ))}
        </>
      )}
    </Tarjeta>
  );
}
