import React, { useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import TodayScreen from '../(tabs)/today';
import { setNewItemDate } from '@/src/store/newItemDate';
import { useLocale } from '@/src/i18n/useLocale';

export default function DayByDate() {
  const { t } = useLocale();
  const { date } = useLocalSearchParams<{ date: string }>();
  const dateStr = typeof date === 'string' ? date : undefined;

  useEffect(() => {
    if (dateStr) setNewItemDate(dateStr);
  }, [dateStr]);

  return (
    <>
      <Stack.Screen options={{ title: t('modal.titleDay') }} />
      <TodayScreen initialDate={dateStr} />
    </>
  );
}
