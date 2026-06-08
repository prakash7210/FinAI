export const THEMES = {
  dark: {
    primary: '#0B3D2E',
    secondary: '#1F7A63',
    accent: '#2ab865',
    background: '#071A14',
    card: '#0F2F26',
    textPrimary: '#FFFFFF',
    textSecondary: '#6B6B6B',
    border: '#1C4D3F',
    classic: '#1f472f',
  },
  light: {
    primary: '#E8F5F0',
    secondary: '#B3E5DB',
    accent: '#2ab865',
    background: '#F5F5F5',
    card: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    border: '#E0E0E0',
    classic: '#F0F0F0',
  },
};

export const COLORS = THEMES.dark;

export const SPACING = {
  sm: 8,
  md: 16,
  lg: 24,
};

export const RADIUS = 14;

export const getColors = theme => THEMES[theme] || THEMES.dark;


