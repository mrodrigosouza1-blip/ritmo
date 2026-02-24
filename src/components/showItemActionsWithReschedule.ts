import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { t } from '@/src/i18n';

export interface RescheduleCallbacks {
  onRescheduleTomorrow: () => void;
  onRescheduleNextWeek: () => void;
  onReschedulePickDate: () => void;
}

export interface ShowItemActionsWithRescheduleOptions {
  isDone: boolean;
  sourceType: 'event' | 'routine' | 'task';
  isMovedRoutine?: boolean;
  onMarkDone: () => void;
  onUndoDone: () => void;
  onEdit: () => void;
  onReschedule: RescheduleCallbacks;
  onSkipToday?: () => void;
  onUndoReschedule?: () => void;
}

function showRescheduleSubmenu(cbs: RescheduleCallbacks): void {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [t('modal.rescheduleTomorrow'), t('modal.rescheduleNextWeek'), t('modal.pickDate'), t('common.cancel')],
        cancelButtonIndex: 3,
      },
      (index) => {
        if (index === 0) cbs.onRescheduleTomorrow();
        else if (index === 1) cbs.onRescheduleNextWeek();
        else if (index === 2) cbs.onReschedulePickDate();
      }
    );
  } else {
    Alert.alert(t('modal.titleReschedule'), undefined, [
      { text: t('modal.rescheduleTomorrow'), onPress: cbs.onRescheduleTomorrow },
      { text: t('modal.rescheduleNextWeek'), onPress: cbs.onRescheduleNextWeek },
      { text: t('modal.pickDate'), onPress: cbs.onReschedulePickDate },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }
}

export function showItemActionsWithReschedule(
  opts: ShowItemActionsWithRescheduleOptions
): void {
  const {
    isDone,
    sourceType,
    isMovedRoutine,
    onMarkDone,
    onUndoDone,
    onEdit,
    onReschedule,
    onSkipToday,
    onUndoReschedule,
  } = opts;

  const mainOptions: string[] = [];
  const mainHandlers: (() => void)[] = [];

  // Principal: marcar/desmarcar
  mainOptions.push(isDone ? t('modal.undoDone') : t('modal.markDone'));
  mainHandlers.push(() => (isDone ? onUndoDone() : onMarkDone()));

  mainOptions.push(t('common.edit'));
  mainHandlers.push(onEdit);

  // Reagendar só quando pending (quando done, focar em desfazer ou editar)
  if (!isDone) {
    mainOptions.push(t('modal.rescheduleAction'));
    mainHandlers.push(() => showRescheduleSubmenu(onReschedule));
    if (sourceType === 'routine' && onSkipToday && !isMovedRoutine) {
      mainOptions.push(t('modal.skipToday'));
      mainHandlers.push(onSkipToday);
    }
    if (sourceType === 'routine' && isMovedRoutine && onUndoReschedule) {
      mainOptions.push(t('modal.undoReschedule'));
      mainHandlers.push(onUndoReschedule);
    }
  }

  mainOptions.push(t('common.cancel'));
  const cancelIndex = mainOptions.length - 1;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: mainOptions, cancelButtonIndex: cancelIndex },
      (index) => {
        if (index !== undefined && index !== cancelIndex) {
          mainHandlers[index]?.();
        }
      }
    );
  } else {
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' }> = mainOptions
      .slice(0, -1)
      .map((text, i) => ({ text, onPress: mainHandlers[i] }));
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('modal.whatToDo'), undefined, buttons);
  }
}
