import React from 'react';
import {
  StyleSheet,
  Pressable,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { getNewItemDate } from '@/src/store/newItemDate';
import { localDayKey } from '@/src/utils/dateKey';
import { useLocale } from '@/src/i18n/useLocale';

export function FabAddMenu() {
  const { t } = useLocale();
  const date = getNewItemDate() || localDayKey(new Date());

  const openAdd = () => router.push(`/modal/event?date=${date}`);
  const openRoutine = () => router.push(`/modal/routine?date=${date}`);
  const openTask = () => router.push(`/modal/task?date=${date}`);

  const showMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('modal.titleEvent'), t('modal.titleRoutine'), t('modal.titleTask'), t('common.cancel')],
          cancelButtonIndex: 3,
        },
        (index) => {
          if (index === 0) openAdd();
          else if (index === 1) openRoutine();
          else if (index === 2) openTask();
        }
      );
    } else {
      Alert.alert(t('common.add'), t('modal.addWhat'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: `➕ ${t('modal.titleEvent')}`, onPress: openAdd },
        { text: `🔁 ${t('modal.titleRoutine')}`, onPress: openRoutine },
        { text: `✅ ${t('modal.titleTask')}`, onPress: openTask },
      ]);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
      ]}
      onPress={showMenu}>
      <FontAwesome name="plus" size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.9,
  },
});
