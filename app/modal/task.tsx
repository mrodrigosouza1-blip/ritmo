import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { TaskForm } from '@/src/features/forms/TaskForm';
import { closeOrNavigateBack } from '@/src/utils/navigation';

export default function TaskModalScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const taskId = typeof id === 'string' ? id : undefined;
  const initialDate = typeof date === 'string' ? date : undefined;
  const mode = taskId ? 'edit' : 'create';

  return (
    <TaskForm
      mode={mode}
      id={taskId}
      initialDate={initialDate}
      onClose={closeOrNavigateBack}
    />
  );
}
