// src/constants/theme.ts
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#38bdf8',    // Light Blue
  secondary: '#6366f1',  // Indigo
  background: '#0f172a', // Dark Slate
  card: '#1e293b',       // Lighter Slate
  text: '#f8fafc',       // White-ish
  textDim: '#94a3b8',    // Gray
  success: '#4ade80',    // Green
  danger: '#ef4444',     // Red
  border: '#334155',
};

export const SIZES = {
  padding: 20,
  radius: 12,
  width,
  height,
  h1: 32,
  h2: 24,
  h3: 18,
  body: 14,
};