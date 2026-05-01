export const colors = {
  // Base
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C28',
  card: '#181824',

  // Brand
  primary: '#C8F56A',       // electric lime — the signature accent
  primaryDim: '#9EC84A',
  primaryGlow: 'rgba(200,245,106,0.15)',

  // Text
  textPrimary: '#F0EDE8',
  textSecondary: '#8A8899',
  textMuted: '#4A4A5A',

  // Semantic
  available: '#C8F56A',
  availableBg: 'rgba(200,245,106,0.1)',
  low: '#F5A623',
  lowBg: 'rgba(245,166,35,0.1)',
  full: '#FF5C5C',
  fullBg: 'rgba(255,92,92,0.1)',

  // Seat types
  seatFree: 'rgba(200,245,106,0.2)',
  seatTaken: 'rgba(74,74,90,0.4)',
  seatPrivate: 'rgba(100,120,255,0.2)',

  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(200,245,106,0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
};

export const typography = {
  // Display — for hero numbers and big moments
  display: { fontSize: 36, fontWeight: '700', letterSpacing: -1.5, color: colors.textPrimary },
  // Heading
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary },
  h2: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: colors.textPrimary },
  h3: { fontSize: 14, fontWeight: '600', letterSpacing: 0.2, color: colors.textSecondary },
  // Body
  body: { fontSize: 14, fontWeight: '400', lineHeight: 22, color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted },
};
