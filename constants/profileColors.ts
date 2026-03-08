export interface ProfileColor {
  id: string;
  hex: string;
  label: string;
}

export const PROFILE_COLORS: ProfileColor[] = [
  { id: 'red',      hex: '#F44336', label: 'Rosso' },
  { id: 'pink',     hex: '#E91E63', label: 'Rosa' },
  { id: 'orange',   hex: '#FF9800', label: 'Arancio' },
  { id: 'yellow',   hex: '#FFC107', label: 'Giallo' },
  { id: 'green',    hex: '#4CAF50', label: 'Verde' },
  { id: 'teal',     hex: '#009688', label: 'Teal' },
  { id: 'blue',     hex: '#2196F3', label: 'Blu' },
  { id: 'indigo',   hex: '#3F51B5', label: 'Indaco' },
  { id: 'purple',   hex: '#9C27B0', label: 'Viola' },
  { id: 'brown',    hex: '#795548', label: 'Marrone' },
  { id: 'grey',     hex: '#607D8B', label: 'Grigio' },
  { id: 'black',    hex: '#37474F', label: 'Antracite' },
];

const DEFAULT_COLOR = PROFILE_COLORS[0]; // verde

export function getProfileColor(colorHex?: string): ProfileColor {
  if (!colorHex) return DEFAULT_COLOR;
  return PROFILE_COLORS.find((c) => c.hex === colorHex) ?? DEFAULT_COLOR;
}
