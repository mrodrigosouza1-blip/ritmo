import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/theme/colors';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

export function SettingsRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  disabled = false,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      {icon && (
        <FontAwesome
          name={icon}
          size={20}
          color={disabled ? colors.textSecondary : colors.primary}
          style={styles.icon}
        />
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.title, disabled && styles.titleDisabled]}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right ?? (onPress && !disabled ? (
        <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
      ) : null)}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable style={styles.wrapper} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  rowDisabled: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  titleDisabled: {
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
