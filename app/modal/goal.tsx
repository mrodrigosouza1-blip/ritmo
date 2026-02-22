import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { GoalForm } from '@/src/features/forms/GoalForm';
import { closeOrNavigateBack } from '@/src/utils/navigation';

export default function GoalModalScreen() {
  const { id, category_id } = useLocalSearchParams<{ id?: string; category_id?: string }>();
  const goalId = typeof id === 'string' ? id : undefined;
  const categoryId = typeof category_id === 'string' ? category_id : undefined;
  const mode = goalId ? 'edit' : 'create';

  return (
    <GoalForm
      mode={mode}
      id={goalId}
      categoryId={categoryId}
      onClose={closeOrNavigateBack}
    />
  );
}
