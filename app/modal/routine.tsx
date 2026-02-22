import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { RoutineForm } from '@/src/features/forms/RoutineForm';
import { closeOrNavigateBack } from '@/src/utils/navigation';

export default function RoutineModalScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const routineId = typeof id === 'string' ? id : undefined;
  const initialDate = typeof date === 'string' ? date : undefined;
  const mode = routineId ? 'edit' : 'create';

  return (
    <RoutineForm
      mode={mode}
      id={routineId}
      initialDate={initialDate}
      onClose={closeOrNavigateBack}
    />
  );
}
