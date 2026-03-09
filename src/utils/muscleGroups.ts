export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: '#FF6B6B',
  back: '#4ECDC4',
  shoulders: '#45B7D1',
  biceps: '#96CEB4',
  triceps: '#FFEAA7',
  forearms: '#DDA0DD',
  abs: '#98D8C8',
  quads: '#F7DC6F',
  hamstrings: '#BB8FCE',
  glutes: '#F0A500',
  calves: '#AED6F1',
  traps: '#A9CCE3',
  lats: '#A2D9CE',
};

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  traps: 'Traps',
  lats: 'Lats',
};

export function getMuscleColor(muscle: string): string {
  return MUSCLE_GROUP_COLORS[muscle.toLowerCase()] || '#CCCCCC';
}

export function getMuscleLabel(muscle: string): string {
  return MUSCLE_GROUP_LABELS[muscle.toLowerCase()] || muscle;
}

export const ALL_MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS);
