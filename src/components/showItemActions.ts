import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { t } from '@/src/i18n';

interface ShowItemActionsOptions {
  isDone: boolean;
  onMarkDone: () => void;
  onUndoDone: () => void;
  onEdit: () => void;
}

export function showItemActions({
  isDone,
  onMarkDone,
  onUndoDone,
  onEdit,
}: ShowItemActionsOptions): void {
  if (Platform.OS === 'ios') {
    const options = isDone
      ? [t('modal.undoDone'), t('common.edit'), t('common.cancel')]
      : [t('modal.markDone'), t('common.edit'), t('common.cancel')];
    const cancelIndex = 2;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
      },
      (index) => {
        if (index === 0) {
          isDone ? onUndoDone() : onMarkDone();
        } else if (index === 1) {
          onEdit();
        }
      }
    );
  } else {
    const markLabel = isDone ? t('modal.undoDone') : t('modal.markDone');
    Alert.alert(t('modal.whatToDo'), undefined, [
      {
        text: markLabel,
        onPress: () => (isDone ? onUndoDone() : onMarkDone()),
      },
      {
        text: t('common.edit'),
        onPress: onEdit,
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ]);
  }
}
