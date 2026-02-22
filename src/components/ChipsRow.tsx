import React from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  View,
} from 'react-native';

import { colors } from '@/src/theme/colors';

export interface ChipItem {
  id: string;
  label: string;
  colorHex?: string;
}

interface ChipsRowProps {
  items: ChipItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ChipsRow({ items, selectedId, onSelect }: ChipsRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => onSelect(item.id)}>
            {item.colorHex != null && (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: item.colorHex },
                  isSelected && styles.dotSelected,
                ]}
              />
            )}
            <Text
              style={[
                styles.chipLabel,
                isSelected && styles.chipLabelSelected,
              ]}
              numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
