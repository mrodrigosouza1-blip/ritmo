import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

interface SectionHeaderProps {
  title: string;
  count: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.title}>
        {title} ({count})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    width: 4,
    height: 18,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
