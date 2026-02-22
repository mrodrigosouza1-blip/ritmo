import { Text, VStack, HStack, Circle } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, frame } from '@expo/ui/swift-ui/modifiers';
import type { WidgetBase } from 'expo-widgets';
import type { WidgetsTodaySnapshot, WidgetsNextEventSnapshot } from '@/src/services/widgetsSync';

function formatTime(t: string): string {
  if (!t || t.length < 5) return t;
  return t.slice(0, 5);
}

const RitmoTodayWidget = (props: WidgetBase<WidgetsTodaySnapshot>) => {
  'widget';
  const today = localDate();
  const isStale = props.snapshotDate !== today;
  const { total, done, topCategories } = props;

  if (isStale) {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 14 }),
            foregroundStyle('#8E8E93'),
          ]}>
          Hoje
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93'), padding({ top: 6 })]}>
          Abra o app para atualizar
        </Text>
      </VStack>
    );
  }

  const subtitle = `${total} itens${done > 0 ? ` • ${done} feitos` : ''}`;
  const isMedium = props.family === 'systemMedium';

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#1C1C1E')]}>
        Hoje
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle('#8E8E93'), padding({ top: 2 })]}>
        {subtitle}
      </Text>
      {topCategories.length > 0 && (
        <HStack spacing={6} modifiers={[padding({ top: 8 })]}>
          {topCategories.slice(0, isMedium ? 3 : 2).map((cat) => (
            <Circle
              key={cat.name}
              modifiers={[
                foregroundStyle(cat.color_hex || '#8E8E93'),
                frame({ width: 8, height: 8 }),
              ]}
            />
          ))}
        </HStack>
      )}
    </VStack>
  );
};

const RitmoNextWidget = (
  props: WidgetBase<{
    snapshotDate: string;
    updated_at: number;
    nextEvent: WidgetsNextEventSnapshot | null;
  }>
) => {
  'widget';
  const today = localDate();
  const isStale = props.snapshotDate !== today;
  const { nextEvent } = props;

  if (isStale) {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 14 }),
            foregroundStyle('#8E8E93'),
          ]}>
          Próximo
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93'), padding({ top: 6 })]}>
          Abra o app para atualizar
        </Text>
      </VStack>
    );
  }

  if (!nextEvent) {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text
          modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#1C1C1E')]}>
          Próximo
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#8E8E93'), padding({ top: 6 })]}>
          Sem compromissos hoje
        </Text>
      </VStack>
    );
  }

  const isMedium = props.family === 'systemMedium';

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#1C1C1E')]}>
        Próximo
      </Text>
      <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#1C1C1E'), padding({ top: 4 })]}>
        {formatTime(nextEvent.start_at)} — {nextEvent.title}
      </Text>
      {nextEvent.location && isMedium && (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93'), padding({ top: 2 })]}>
          📍 {nextEvent.location}
        </Text>
      )}
    </VStack>
  );
};

function localDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

(async () => {
  try {
    const { registerWidgetLayout } = await import('expo-widgets');
    registerWidgetLayout('RitmoTodayWidget', RitmoTodayWidget);
    registerWidgetLayout('RitmoNextWidget', RitmoNextWidget);
  } catch {
    // Expo Go ou ambiente sem módulo nativo — widgets não disponíveis
  }
})();
