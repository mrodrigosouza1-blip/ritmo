import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  generateDayItems,
  markDayItemDone,
  getRoutinesWithTimesForDay,
  type RoutineWithTimesItem,
} from '@/src/features/today/generateDayItems';
import { runPremiumIntelligence } from '@/src/services/premiumIntelligence';
import { toggleDayRoutineTime } from '@/src/services/dayRoutineTimes';
import { getActiveRoutines } from '@/src/services/routines';
import { getCategoryDisplayName } from '@/src/services/categoryDisplay';
import { getNextUpcomingEvent, type EventWithCategory } from '@/src/services/events';
import { getAllCategories, ensureDefaultCategories } from '@/src/services/categories';
import {
  getTodayTypeFilter,
  setTodayTypeFilter,
  getTodayCategoryFilter,
  setTodayCategoryFilter,
  type TodayTypeFilter,
} from '@/src/services/uiState';
import { DateField } from '@/src/components/DateField';
import { ChipsRow, type ChipItem } from '@/src/components/ChipsRow';
import { SectionHeader } from '@/src/components/SectionHeader';
import { showItemActionsWithReschedule } from '@/src/components/showItemActionsWithReschedule';
import {
  rescheduleTask,
  rescheduleEvent,
  rescheduleRoutineOccurrence,
  skipRoutineForDate,
  undoRoutineReschedule,
  getTomorrowIso,
  getNextWeekSameDayIso,
} from '@/src/services/reschedule';
import { localDayKey } from '@/src/utils/dateKey';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { getWeeklyDoneCountsByCategory } from '@/src/services/goalsProgress';
import { listGoalsWeekly } from '@/src/services/goalsWeekly';
import { debouncedSyncWidgets } from '@/src/services/widgetsSync';
import { setNewItemDate } from '@/src/store/newItemDate';
import type { DayItemWithDetails } from '@/src/types';
import { colors } from '@/src/theme/colors';
import { useLocale } from '@/src/i18n/useLocale';
import { formatDate, formatWeekday, formatNextEventDay } from '@/src/utils/formatDate';
import { useToast } from '@/src/components/toast';
import { AnimatedDoneCard } from '@/src/components/AnimatedDoneCard';
import { FadeInCheck } from '@/src/components/FadeInCheck';
import { FabAddMenu } from '@/src/components/FabAddMenu';

const BLOCK_COLORS = {
  morning: colors.morning,
  afternoon: colors.afternoon,
  evening: colors.evening,
} as const;

function openEdit(item: DayItemWithDetails, date: string): void {
  if (item.source_type === 'event') {
    router.push(`/modal/event?id=${item.source_id}&date=${date}`);
  } else if (item.source_type === 'routine') {
    router.push(`/modal/routine?id=${item.source_id}&date=${date}`);
  } else if (item.source_type === 'task') {
    router.push(`/modal/task?id=${item.source_id}`);
  }
}

export default function TodayScreen({ initialDate }: { initialDate?: string }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const todayIso = localDayKey(new Date());
  const [date, setDate] = useState(initialDate ?? todayIso);
  const [items, setItems] = useState<DayItemWithDetails[]>([]);
  const [routinesWithTimes, setRoutinesWithTimes] = useState<RoutineWithTimesItem[]>([]);
  const [hasRoutines, setHasRoutines] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [typeFilter, setTypeFilterState] = useState<TodayTypeFilter>('all');
  const [categoryFilter, setCategoryFilterState] = useState<string>('all');
  const [categories, setCategories] = useState<ChipItem[]>([]);
  const [nextUpcomingEvent, setNextUpcomingEvent] = useState<EventWithCategory | null>(null);

  const displayDate = date || todayIso;

  const weekdayLabel = useMemo(
    () => formatWeekday(displayDate, locale),
    [displayDate, locale]
  );

  useEffect(() => {
    (async () => {
      const [type, cat] = await Promise.all([
        getTodayTypeFilter(),
        getTodayCategoryFilter(),
      ]);
      setTypeFilterState(type);
      setCategoryFilterState(cat);
    })();
  }, []);

  useEffect(() => {
    ensureDefaultCategories().then(() =>
      getAllCategories().then((list) => {
        setCategories([
          { id: 'all', label: t('common.all') },
          ...list.map((c) => ({ id: c.id, label: getCategoryDisplayName(c), colorHex: c.color_hex })),
        ]);
      })
    );
  }, [t, locale]);

  const setTypeFilter = useCallback(async (v: TodayTypeFilter) => {
    setTypeFilterState(v);
    await setTodayTypeFilter(v);
  }, []);

  const setCategoryFilter = useCallback(async (v: string) => {
    setCategoryFilterState(v);
    await setTodayCategoryFilter(v);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const isViewingToday = date === todayIso;
      const [result, routinesWithTimesData, routines, nextEvent] = await Promise.all([
        generateDayItems(date),
        getRoutinesWithTimesForDay(date),
        getActiveRoutines(),
        isViewingToday ? getNextUpcomingEvent(todayIso) : Promise.resolve(null),
      ]);
      setItems(result);
      setRoutinesWithTimes(routinesWithTimesData);
      setHasRoutines(routines.length > 0);
      setNextUpcomingEvent(nextEvent ?? null);
      if (isViewingToday) {
        debouncedSyncWidgets(todayIso);
      }
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, todayIso, locale]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    setNewItemDate(date);
  }, [date]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  const handleMarkDone = useCallback(
    async (item: DayItemWithDetails) => {
      const categoryId = item.category_id;
      const { start, end } = getWeekRangeISO(new Date(displayDate + 'T12:00:00'));
      const beforeCounts = categoryId
        ? (await getWeeklyDoneCountsByCategory(start, end)).get(categoryId) ?? 0
        : 0;

      await markDayItemDone(item.id, true, displayDate);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'done' as const, done_at: new Date().toISOString() }
            : i
        )
      );
      debouncedSyncWidgets(todayIso);

      let goalReached = false;
      if (categoryId) {
        const [afterMap, goals] = await Promise.all([
          getWeeklyDoneCountsByCategory(start, end),
          listGoalsWeekly(),
        ]);
        const afterCount = afterMap.get(categoryId) ?? 0;
        const goal = goals.find((g) => g.category_id === categoryId);
        if (goal && beforeCounts < goal.target_count && afterCount >= goal.target_count) {
          goalReached = true;
        }
      }

      showToast({
        message: goalReached ? t('toast.goalReached') : t('toast.markedDone'),
        type: 'success',
      });
    },
    [showToast, todayIso, displayDate, t]
  );

  const handleUndoDone = useCallback(
    async (id: string) => {
      await markDayItemDone(id, false);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'pending' as const, done_at: undefined }
            : item
        )
      );
      debouncedSyncWidgets(todayIso);
      showToast({ message: t('toast.markedPending'), type: 'info' });
    },
    [showToast, todayIso]
  );

  const fromDateForItem = (item: DayItemWithDetails) =>
    (item.source_type === 'routine' && item.movedFromDate) ? item.movedFromDate : displayDate;

  const handleReschedule = useCallback(
    async (item: DayItemWithDetails, toDate: string) => {
      const from = fromDateForItem(item);
      if (item.source_type === 'event') {
        await rescheduleEvent(item.source_id, from, toDate);
      } else if (item.source_type === 'task') {
        await rescheduleTask(item.source_id, from, toDate);
      } else if (item.source_type === 'routine') {
        await rescheduleRoutineOccurrence(
          item.source_id,
          from,
          toDate,
          item.movedFromDate ? displayDate : undefined
        );
      }
      await loadItems();
    },
    [loadItems]
  );

  const handleSkipToday = useCallback(
    async (routineId: string) => {
      await skipRoutineForDate(routineId, displayDate);
      await loadItems();
    },
    [displayDate, loadItems]
  );

  const handleUndoReschedule = useCallback(
    async (item: DayItemWithDetails) => {
      if (item.source_type !== 'routine' || !item.movedFromDate) return;
      await undoRoutineReschedule(item.source_id, displayDate, item.movedFromDate);
      await loadItems();
    },
    [displayDate, loadItems]
  );

  const handleToggleRoutineTime = useCallback(
    async (routineId: string, timeHHmm: string) => {
      const nextStatus = await toggleDayRoutineTime(displayDate, routineId, timeHHmm);
      setRoutinesWithTimes((prev) =>
        prev.map((r) => {
          if (r.routine.id !== routineId) return r;
          return {
            ...r,
            dayRoutineTimes: r.dayRoutineTimes.map((d) =>
              d.time === timeHHmm ? { ...d, status: nextStatus } : d
            ),
          };
        })
      );
      debouncedSyncWidgets(todayIso);
      if (nextStatus === 'done') {
        runPremiumIntelligence(displayDate).catch(() => {});
        showToast({ message: t('toast.routineTimeDone', { time: timeHHmm }), type: 'success' });
      }
    },
    [displayDate, todayIso, showToast]
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') {
      result = result.filter((i) => i.source_type === typeFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category_id === categoryFilter);
    }
    return result;
  }, [items, typeFilter, categoryFilter]);

  const filteredRoutinesWithTimes = useMemo(() => {
    let result = routinesWithTimes;
    if (typeFilter === 'event' || typeFilter === 'task') return [];
    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category_id === categoryFilter);
    }
    return result;
  }, [routinesWithTimes, typeFilter, categoryFilter]);

  const events = useMemo(
    () =>
      [...filteredItems.filter((i) => i.source_type === 'event')].sort((a, b) =>
        (a.start_at ?? 'zz:zz').localeCompare(b.start_at ?? 'zz:zz')
      ),
    [filteredItems]
  );
  const routines = useMemo(
    () =>
      [...filteredItems.filter((i) => i.source_type === 'routine')].sort((a, b) => {
        const blockOrder = { morning: 0, afternoon: 1, evening: 2, none: 3 };
        const blockA = blockOrder[(a.block as keyof typeof blockOrder) ?? 'morning'] ?? 3;
        const blockB = blockOrder[(b.block as keyof typeof blockOrder) ?? 'morning'] ?? 3;
        if (blockA !== blockB) return blockA - blockB;
        return (a.start_at ?? '00:00').localeCompare(b.start_at ?? '00:00');
      }),
    [filteredItems]
  );
  const tasks = useMemo(
    () =>
      [...filteredItems.filter((i) => i.source_type === 'task')].sort((a, b) => {
        const timeA = a.start_at ?? 'zz:zz';
        const timeB = b.start_at ?? 'zz:zz';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return (a.title ?? '').localeCompare(b.title ?? '');
      }),
    [filteredItems]
  );
  const localizedCategories = useMemo(
    () =>
      categories.map((c) =>
        c.id === 'all' ? { ...c, label: t('common.all') } : c
      ),
    [categories, t]
  );

  const typeChips: ChipItem[] = useMemo(
    () => [
      { id: 'all', label: t('common.all') },
      { id: 'event', label: t('today.events') },
      { id: 'routine', label: t('today.routines') },
      { id: 'task', label: t('today.tasks') },
    ],
    [t]
  );

  const renderItemCard = (item: DayItemWithDetails) => {
    const block = (item.block as keyof typeof BLOCK_COLORS) ?? 'morning';
    return (
      <AnimatedDoneCard
        key={item.id}
        done={item.status === 'done'}
        onPress={() =>
          showItemActionsWithReschedule({
            isDone: item.status === 'done',
            sourceType: item.source_type,
            isMovedRoutine: !!item.movedFromDate,
            onMarkDone: () => handleMarkDone(item),
            onUndoDone: () => handleUndoDone(item.id),
            onEdit: () => openEdit(item, displayDate),
            onReschedule: {
              onRescheduleTomorrow: () =>
                handleReschedule(item, getTomorrowIso(displayDate)),
              onRescheduleNextWeek: () =>
                handleReschedule(item, getNextWeekSameDayIso(displayDate)),
              onReschedulePickDate: () =>
                router.push(
                  `/modal/reschedule?type=${item.source_type}&id=${item.source_id}&fromDate=${encodeURIComponent(fromDateForItem(item))}&currentDate=${encodeURIComponent(displayDate)}`
                ),
            },
            onSkipToday:
              item.source_type === 'routine' && !item.movedFromDate
                ? () => handleSkipToday(item.source_id)
                : undefined,
            onUndoReschedule:
              item.source_type === 'routine' && item.movedFromDate
                ? () => handleUndoReschedule(item)
                : undefined,
          })
        }
        style={[
          styles.itemCard,
          item.status === 'done' && styles.itemDone,
        ]}>
        <View
          style={[
            styles.checkbox,
            item.status === 'done' && styles.checkboxDone,
          ]}>
          <FadeInCheck visible={item.status === 'done'}>
            <Text style={styles.checkmark}>✓</Text>
          </FadeInCheck>
        </View>
        <View
          style={[
            styles.itemIndicator,
            { backgroundColor: item.color_hex ?? BLOCK_COLORS[block] },
          ]}
        />
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemTitle,
              item.status === 'done' && styles.itemTitleDone,
            ]}
            numberOfLines={2}>
            {item.title}
          </Text>
          {item.start_at && (
            <Text style={styles.itemTime}>
              {item.start_at.slice(0, 5)}
              {item.end_at && item.end_at !== item.start_at
                ? ` - ${item.end_at.slice(0, 5)}`
                : ''}
            </Text>
          )}
          {!!item.category_name && (
            <Text
              style={[
                styles.itemMeta,
                item.color_hex && { color: item.color_hex },
              ]}>
              • {item.category_name}
            </Text>
          )}
          {!!item.location?.trim() && (
            <Text style={styles.itemMeta} numberOfLines={1}>
              📍 {item.location.trim()}
            </Text>
          )}
          {!!item.notes?.trim() && (
            <Text style={styles.itemMeta} numberOfLines={2}>
              📝 {item.notes.trim()}
            </Text>
          )}
          {!!item.movedFromDate && (
            <Text style={styles.rescheduledBadge}>{t('today.rescheduled')}</Text>
          )}
          {item.status === 'done' && (
            <Text style={styles.doneBadge}>{t('today.done')}</Text>
          )}
        </View>
      </AnimatedDoneCard>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
      <View style={styles.dateHeader}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {formatDate(displayDate, locale)} — {weekdayLabel}
          </Text>
          <Pressable
            style={styles.pickDateBtn}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickDateText}>{t('today.pickDate')}</Text>
          </Pressable>
        </View>
        {date !== todayIso && (
          <Pressable
            style={styles.todayBtn}
            onPress={() => setDate(todayIso)}>
            <Text style={styles.todayBtnText}>{t('today.goToToday')}</Text>
          </Pressable>
        )}
        {!hasRoutines && items.length > 0 && (
          <Pressable
            style={styles.templateCta}
            onPress={() => router.push('/templates')}>
            <Text style={styles.templateCtaTitle}>{t('today.templateCtaTitle')}</Text>
            <Text style={styles.templateCtaDesc}>{t('today.templateCtaDesc')}</Text>
            <Text style={styles.templateCtaBtn}>{t('today.viewTemplates')}</Text>
          </Pressable>
        )}
      </View>

      {!loading &&
        (items.some(
          (i) =>
            i.source_type === 'event' ||
            i.source_type === 'routine' ||
            i.source_type === 'task'
        ) || routinesWithTimes.length > 0) && (
        <View style={styles.filtersSection}>
          <ChipsRow
            items={typeChips}
            selectedId={typeFilter}
            onSelect={(id) => setTypeFilter(id as TodayTypeFilter)}
          />
          <ChipsRow
            items={localizedCategories}
            selectedId={categoryFilter}
            onSelect={setCategoryFilter}
          />
        </View>
      )}

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('modal.chooseDate')}</Text>
            <DateField
              value={date}
              onChange={(iso) => {
                setDate(iso);
                setShowDatePicker(false);
              }}
            />
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setShowDatePicker(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {!items.some(
        (i) =>
          i.source_type === 'event' ||
          i.source_type === 'routine' ||
          i.source_type === 'task'
      ) && routinesWithTimes.length === 0 ? (
        <>
          {date === todayIso && nextUpcomingEvent && (
            <Pressable
              style={[
                styles.nextEventCard,
                {
                  borderLeftColor: nextUpcomingEvent.color_hex ?? colors.primary,
                },
              ]}
              onPress={() => router.push(`/day/${nextUpcomingEvent.date}`)}>
              <View style={styles.nextEventContent}>
                <Text style={styles.nextEventLabel}>{t('today.nextEvent')}</Text>
                <Text style={styles.nextEventTitle}>{nextUpcomingEvent.title}</Text>
                <Text style={styles.nextEventSub}>
                  {[
                    formatNextEventDay(nextUpcomingEvent.date, todayIso, locale),
                    nextUpcomingEvent.start_at?.slice(0, 5),
                    nextUpcomingEvent.location?.trim(),
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            </Pressable>
          )}
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayTitle}>
              {date === todayIso ? t('today.emptyTitle') : t('today.emptyDay')}
            </Text>
            <Text style={styles.emptyDayDesc}>{t('today.emptySubtitle')}</Text>
            <View style={styles.emptyDayActions}>
              <Pressable
                style={styles.emptyDayBtn}
                onPress={() => router.push(`/modal/event?date=${date}`)}>
                <Text style={styles.emptyDayBtnText}>{t('today.emptyAddEvent')}</Text>
              </Pressable>
              <Pressable
                style={styles.emptyDayBtn}
                onPress={() => router.push(`/modal/routine?date=${date}`)}>
                <Text style={styles.emptyDayBtnText}>{t('today.emptyAddRoutine')}</Text>
              </Pressable>
              <Pressable
                style={styles.emptyDayBtn}
                onPress={() => router.push(`/modal/task?date=${date}`)}>
                <Text style={styles.emptyDayBtnText}>{t('today.emptyAddTask')}</Text>
              </Pressable>
            </View>
            {!hasRoutines && (
              <Pressable
                style={styles.templateCta}
                onPress={() => router.push('/templates')}>
            <Text style={styles.templateCtaTitle}>{t('today.templateCtaTitle')}</Text>
            <Text style={styles.templateCtaDesc}>{t('today.templateCtaDesc')}</Text>
            <Text style={styles.templateCtaBtn}>{t('today.viewTemplates')}</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayTitle}>{t('today.emptyFilters')}</Text>
          <Text style={styles.emptyDayDesc}>{t('today.emptyFiltersHint')}</Text>
        </View>
      ) : (
        <>
          {events.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title={t('today.events')} count={events.length} />
              {events.map(renderItemCard)}
            </View>
          )}
          {(routines.length > 0 || filteredRoutinesWithTimes.length > 0) && (
            <View style={styles.section}>
              <SectionHeader
                title={t('today.routines')}
                count={routines.length + filteredRoutinesWithTimes.length}
              />
              {filteredRoutinesWithTimes.map((rwt) => (
                <View
                  key={rwt.routine.id}
                  style={[
                    styles.routineTimesCard,
                    {
                      borderLeftColor:
                        rwt.color_hex ?? BLOCK_COLORS.morning,
                    },
                  ]}>
                  <Pressable
                    onPress={() =>
                      showItemActionsWithReschedule({
                        isDone: false,
                        sourceType: 'routine',
                        isMovedRoutine: false,
                        onMarkDone: () => {},
                        onUndoDone: () => {},
                        onEdit: () => router.push(`/modal/routine?id=${rwt.routine.id}&date=${displayDate}`),
                        onReschedule: {
                          onRescheduleTomorrow: () =>
                            handleReschedule(
                              {
                                id: '',
                                source_type: 'routine',
                                source_id: rwt.routine.id,
                                date: displayDate,
                                status: 'pending',
                                title: rwt.routine.title,
                                start_at: rwt.dayRoutineTimes[0]?.time,
                                block: 'morning',
                                category_id: rwt.category_id,
                                category_name: rwt.category_name,
                                color_hex: rwt.color_hex,
                                movedFromDate: undefined,
                              } as DayItemWithDetails,
                              getTomorrowIso(displayDate)
                            ),
                          onRescheduleNextWeek: () =>
                            handleReschedule(
                              {
                                id: '',
                                source_type: 'routine',
                                source_id: rwt.routine.id,
                                date: displayDate,
                                status: 'pending',
                                title: rwt.routine.title,
                                start_at: rwt.dayRoutineTimes[0]?.time,
                                block: 'morning',
                                category_id: rwt.category_id,
                                category_name: rwt.category_name,
                                color_hex: rwt.color_hex,
                                movedFromDate: undefined,
                              } as DayItemWithDetails,
                              getNextWeekSameDayIso(displayDate)
                            ),
                          onReschedulePickDate: () =>
                            router.push(
                              `/modal/reschedule?type=routine&id=${rwt.routine.id}&fromDate=${encodeURIComponent(displayDate)}&currentDate=${encodeURIComponent(displayDate)}`
                            ),
                        },
                        onSkipToday: () => handleSkipToday(rwt.routine.id),
                      })
                    }
                    style={styles.routineTimesHeader}>
                    <Text style={styles.routineTimesTitle}>{rwt.routine.title}</Text>
                    {!!rwt.category_name && (
                      <Text
                        style={[
                          styles.routineTimesMeta,
                          rwt.color_hex && { color: rwt.color_hex },
                        ]}>
                        • {rwt.category_name}
                      </Text>
                    )}
                  </Pressable>
                  <View style={styles.routineTimesList}>
                    {rwt.dayRoutineTimes.map((drt) => (
                      <AnimatedDoneCard
                        key={drt.id}
                        done={drt.status === 'done'}
                        onPress={() => handleToggleRoutineTime(rwt.routine.id, drt.time)}
                        style={[styles.routineTimeRow, drt.status === 'done' ? styles.itemDone : null]}>
                        <View
                          style={[
                            styles.checkbox,
                            drt.status === 'done' && styles.checkboxDone,
                          ]}>
                          <FadeInCheck visible={drt.status === 'done'}>
                            <Text style={styles.checkmark}>✓</Text>
                          </FadeInCheck>
                        </View>
                        <Text
                          style={[
                            styles.routineTimeLabel,
                            drt.status === 'done' && styles.itemTitleDone,
                          ]}>
                          {drt.time}
                        </Text>
                      </AnimatedDoneCard>
                    ))}
                  </View>
                </View>
              ))}
              {routines.map(renderItemCard)}
            </View>
          )}
          {tasks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title={t('today.tasks')} count={tasks.length} />
              {tasks.map(renderItemCard)}
            </View>
          )}
        </>
      )}
      </ScrollView>
      <FabAddMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  dateHeader: {
    padding: 16,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  filtersSection: {
    backgroundColor: colors.card,
    marginBottom: 8,
    paddingBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  pickDateBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pickDateText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  todayBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  todayBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  templateCta: {
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  templateCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  templateCtaDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  templateCtaBtn: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalCloseBtn: {
    marginTop: 8,
    padding: 12,
    alignSelf: 'flex-end',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  nextEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  nextEventContent: {
    flex: 1,
  },
  nextEventLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextEventSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyDay: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDayDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDayActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  emptyDayBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyDayBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  routineTimesCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  routineTimesHeader: {
    padding: 12,
  },
  routineTimesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  routineTimesMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  routineTimesList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  routineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  routineTimeLabel: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
  },
  itemDone: {
    opacity: 0.7,
  },
  itemIndicator: {
    width: 4,
    height: '100%',
    minHeight: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  itemTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  rescheduledBadge: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  doneBadge: {
    marginTop: 4,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
