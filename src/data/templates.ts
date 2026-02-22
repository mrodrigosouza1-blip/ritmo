export type TemplateBlock = 'morning' | 'afternoon' | 'evening' | 'none';

export type CategorySlug = 'work' | 'fitness' | 'study' | 'home' | 'personal';

export interface RoutineTemplateItem {
  titleKey: string;
  block: TemplateBlock;
  default_time?: string;
  times?: string[];
  category: { slug: CategorySlug; color_hex: string; icon?: string };
  rule: {
    freq: 'daily' | 'weekly';
    interval: number;
    byweekday?: number[];
  };
  notesKey?: string;
  location?: string;
}

export interface TemplateGoal {
  categorySlug: CategorySlug;
  target_count: number;
}

export interface RoutineTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  color_hex?: string;
  routines: RoutineTemplateItem[];
  goals?: TemplateGoal[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'tpl-work',
    nameKey: 'templates.productiveWork.name',
    descriptionKey: 'templates.productiveWork.description',
    color_hex: '#5C6BC0',
    routines: [
      {
        titleKey: 'templates.productiveWork.items.reviewPriorities',
        block: 'morning',
        default_time: '08:00',
        category: { slug: 'work', color_hex: '#5C6BC0', icon: 'briefcase' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.productiveWork.items.deepWork',
        block: 'morning',
        default_time: '09:00',
        category: { slug: 'work', color_hex: '#5C6BC0', icon: 'briefcase' },
        rule: { freq: 'daily', interval: 1 },
        notesKey: 'templates.productiveWork.items.deepWorkNotes',
      },
      {
        titleKey: 'templates.productiveWork.items.checkEmails',
        block: 'afternoon',
        default_time: '14:00',
        category: { slug: 'work', color_hex: '#5C6BC0', icon: 'briefcase' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.productiveWork.items.meetings',
        block: 'afternoon',
        default_time: '15:00',
        category: { slug: 'work', color_hex: '#5C6BC0', icon: 'briefcase' },
        rule: { freq: 'weekly', interval: 1, byweekday: [1, 2, 3, 4, 5] },
      },
      {
        titleKey: 'templates.productiveWork.items.planTomorrow',
        block: 'evening',
        default_time: '18:00',
        category: { slug: 'work', color_hex: '#5C6BC0', icon: 'briefcase' },
        rule: { freq: 'daily', interval: 1 },
      },
    ],
    goals: [{ categorySlug: 'work', target_count: 5 }],
  },
  {
    id: 'tpl-fitness',
    nameKey: 'templates.fitness.name',
    descriptionKey: 'templates.fitness.description',
    color_hex: '#66BB6A',
    routines: [
      {
        titleKey: 'templates.fitness.items.wakeStretch',
        block: 'morning',
        default_time: '06:30',
        category: { slug: 'fitness', color_hex: '#66BB6A', icon: 'heart' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.fitness.items.strengthTraining',
        block: 'morning',
        default_time: '07:00',
        category: { slug: 'fitness', color_hex: '#66BB6A', icon: 'heart' },
        rule: { freq: 'weekly', interval: 1, byweekday: [1, 3, 5] },
      },
      {
        titleKey: 'templates.fitness.items.runCardio',
        block: 'morning',
        default_time: '07:00',
        category: { slug: 'fitness', color_hex: '#66BB6A', icon: 'heart' },
        rule: { freq: 'weekly', interval: 1, byweekday: [2, 4, 6] },
      },
      {
        titleKey: 'templates.fitness.items.drinkWater',
        block: 'morning',
        default_time: '08:00',
        times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        category: { slug: 'fitness', color_hex: '#66BB6A', icon: 'heart' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.fitness.items.meditation',
        block: 'evening',
        default_time: '21:00',
        category: { slug: 'fitness', color_hex: '#66BB6A', icon: 'heart' },
        rule: { freq: 'daily', interval: 1 },
      },
    ],
    goals: [{ categorySlug: 'fitness', target_count: 7 }],
  },
  {
    id: 'tpl-studies',
    nameKey: 'templates.study.name',
    descriptionKey: 'templates.study.description',
    color_hex: '#26A69A',
    routines: [
      {
        titleKey: 'templates.study.items.morningReading',
        block: 'morning',
        default_time: '07:30',
        category: { slug: 'study', color_hex: '#26A69A', icon: 'book' },
        rule: { freq: 'daily', interval: 1 },
        notesKey: 'templates.study.items.morningReadingNotes',
      },
      {
        titleKey: 'templates.study.items.focusedStudy',
        block: 'morning',
        default_time: '09:00',
        category: { slug: 'study', color_hex: '#26A69A', icon: 'book' },
        rule: { freq: 'weekly', interval: 1, byweekday: [1, 2, 3, 4, 5] },
      },
      {
        titleKey: 'templates.study.items.reviewNotes',
        block: 'afternoon',
        default_time: '16:00',
        category: { slug: 'study', color_hex: '#26A69A', icon: 'book' },
        rule: { freq: 'weekly', interval: 1, byweekday: [1, 3, 5] },
      },
      {
        titleKey: 'templates.study.items.practice',
        block: 'evening',
        default_time: '19:00',
        category: { slug: 'study', color_hex: '#26A69A', icon: 'book' },
        rule: { freq: 'weekly', interval: 1, byweekday: [2, 4] },
      },
    ],
    goals: [{ categorySlug: 'study', target_count: 5 }],
  },
  {
    id: 'tpl-home',
    nameKey: 'templates.home.name',
    descriptionKey: 'templates.home.description',
    color_hex: '#FF7043',
    routines: [
      {
        titleKey: 'templates.home.items.makeBed',
        block: 'morning',
        default_time: '07:00',
        category: { slug: 'home', color_hex: '#FF7043', icon: 'user' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.home.items.washDishes',
        block: 'morning',
        default_time: '08:30',
        category: { slug: 'home', color_hex: '#FF7043', icon: 'user' },
        rule: { freq: 'daily', interval: 1 },
      },
      {
        titleKey: 'templates.home.items.generalCleaning',
        block: 'afternoon',
        default_time: '15:00',
        category: { slug: 'home', color_hex: '#FF7043', icon: 'user' },
        rule: { freq: 'weekly', interval: 1, byweekday: [6] },
        notesKey: 'templates.home.items.generalCleaningNotes',
      },
      {
        titleKey: 'templates.home.items.washClothes',
        block: 'afternoon',
        default_time: '14:00',
        category: { slug: 'home', color_hex: '#FF7043', icon: 'user' },
        rule: { freq: 'weekly', interval: 1, byweekday: [6] },
      },
      {
        titleKey: 'templates.home.items.organizeClosets',
        block: 'evening',
        default_time: '20:00',
        category: { slug: 'home', color_hex: '#FF7043', icon: 'user' },
        rule: { freq: 'weekly', interval: 1, byweekday: [0] },
        notesKey: 'templates.home.items.organizeClosetsNotes',
      },
    ],
    goals: [{ categorySlug: 'home', target_count: 5 }],
  },
];

export function getTemplateById(id: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find((t) => t.id === id);
}
