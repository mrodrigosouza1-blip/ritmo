export const colors = {
  // Blocos do dia
  morning: '#FFB74D',
  morningLight: '#FFE0B2',
  afternoon: '#4FC3F7',
  afternoonLight: '#B3E5FC',
  evening: '#9575CD',
  eveningLight: '#D1C4E9',

  // Categorias padrão
  categories: {
    work: '#5C6BC0',
    health: '#66BB6A',
    personal: '#FF7043',
    learning: '#26A69A',
    default: '#78909C',
  },

  // UI
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#4CAF50',
  primary: '#7C4DFF',
  error: '#E53935',
} as const;

export type BlockColor = keyof typeof colors;
