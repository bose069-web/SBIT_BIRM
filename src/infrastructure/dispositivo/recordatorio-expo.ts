import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { HoraRecordatorio } from '@/core/domain/recordatorio';
import type { ContenidoRecordatorio, RecordatorioPort } from '@/core/ports/recordatorio-port';

const CANAL = 'recordatorios';
const ID_DIARIO = 'kampus-recordatorio-diario';

/** Notificaciones locales con expo-notifications (Android e iOS). */
export class RecordatorioExpo implements RecordatorioPort {
  readonly disponible = true;

  constructor() {
    // Con la app abierta también se enseña el aviso.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  async pedirPermiso() {
    // En Android 13+ el permiso no se puede pedir hasta que existe un canal.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Recordatorios',
        importance: AndroidImportance.HIGH,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  }

  async programarDiario({ hora, minuto }: HoraRecordatorio, contenido: ContenidoRecordatorio) {
    await this.cancelar();
    await Notifications.scheduleNotificationAsync({
      identifier: ID_DIARIO,
      content: { title: contenido.titulo, body: contenido.cuerpo },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hora,
        minute: minuto,
        channelId: CANAL,
      },
    });
  }

  async programarPrueba(segundos: number, contenido: ContenidoRecordatorio) {
    await Notifications.scheduleNotificationAsync({
      content: { title: contenido.titulo, body: contenido.cuerpo },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: segundos,
        channelId: CANAL,
      },
    });
  }

  async cancelar() {
    await Notifications.cancelScheduledNotificationAsync(ID_DIARIO);
  }

  async estaProgramado() {
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    return programadas.some((n) => n.identifier === ID_DIARIO);
  }
}
