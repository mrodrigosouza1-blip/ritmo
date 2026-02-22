import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { EventForm } from '@/src/features/forms/EventForm';
import { closeOrNavigateBack } from '@/src/utils/navigation';

export default function EventModalScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const eventId = typeof id === 'string' ? id : undefined;
  const initialDate = typeof date === 'string' ? date : undefined;
  const mode = eventId ? 'edit' : 'create';

  return (
    <EventForm
      mode={mode}
      id={eventId}
      initialDate={initialDate}
      onClose={closeOrNavigateBack}
    />
  );
}
