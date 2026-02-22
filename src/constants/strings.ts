/**
 * Textos reutilizáveis — linguagem humana e consistente.
 */

export const strings = {
  // Botões
  save: 'Salvar',
  cancel: 'Cancelar',
  delete: 'Excluir',
  close: 'Fechar',
  continue: 'Continuar',
  skip: 'Pular',
  done: 'Concluir',
  create: 'Criar',
  edit: 'Editar',

  // Empty states
  emptyToday: 'Nada planejado para hoje',
  emptyDay: 'Nenhum item neste dia',
  emptyDayHint: 'Adicione um compromisso, rotina ou tarefa para começar',
  emptyFilters: 'Nenhum item com estes filtros',
  emptyFiltersHint: 'Tente alterar o tipo ou a categoria selecionada',
  emptyGoals: 'Nenhuma meta configurada ainda.',
  emptyGoalsHint: 'Crie metas manualmente ou use um template para gerar rotinas e metas.',
  emptyReports: 'Sem atividades registradas neste mês.',
  emptySummary: 'Nenhuma meta configurada.',

  // Ações vazias
  addEvent: '+ Compromisso',
  addRoutine: '+ Rotina',
  addTask: '+ Tarefa',
  createGoal: 'Criar meta',
  viewTemplates: 'Ver templates',
  templatesLabel: 'Templates de Rotina',

  // Toasts
  toastSaved: 'Salvo',
  toastUpdated: 'Atualizado',
  toastConfigApplied: 'Configuração aplicada',
  toastMarkedDone: 'Marcado como realizado',
  toastMarkedPending: 'Marcado como pendente',
  toastTaskSaved: 'Tarefa salva',
  toastTaskDeleted: 'Tarefa excluída',
  toastGoalCreated: 'Meta criada',
  toastGoalUpdated: 'Meta atualizada',
  toastTemplateApplied: 'Template aplicado',
  toastNotificationsUpdated: 'Notificações atualizadas',
  toastExportSuccess: 'Exportado',
  toastDataCleared: 'Dados apagados',
  toastExportFailed: 'Falha ao exportar',
  toastClearFailed: 'Falha ao apagar dados',
  toastShareUnavailable: 'Compartilhamento não disponível neste dispositivo',
  toastSubscriptionSoon: 'Gerenciamento de assinatura em breve',
  toastTemplateError: 'Erro ao aplicar template',

  // Carregamento
  loading: 'Carregando...',

  // Premium
  premium: 'Premium',
  premiumRequired: 'Recurso exclusivo para assinantes Premium.',
} as const;
