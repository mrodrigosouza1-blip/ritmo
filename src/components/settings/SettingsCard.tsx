import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/theme/colors';

interface SettingsCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  badge?: string;
  premium?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

export function SettingsCard({
  title,
  subtitle,
  icon = 'star',
  badge,
  premium = false,
  onPress,
  children,
}: SettingsCardProps) {
  const card = (
    <View style={[styles.card, premium && styles.cardPremium]}>
      <View style={styles.iconWrap}>
        <FontAwesome
          name={icon}
          size={28}
          color={premium ? colors.primary : colors.textSecondary}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, premium && styles.badgePremium]}>
              <Text style={[styles.badgeText, premium && styles.badgeTextPremium]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
        {children}
      </View>
      {onPress && (
        <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{card}</Pressable>;
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  cardPremium: {
    borderLeftColor: colors.primary,
  },
  iconWrap: {
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePremium: {
    backgroundColor: colors.primary + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badgeTextPremium: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
