/**
 * Firdam's look, shared by every screen: the brand colours from the website,
 * Plus Jakarta Sans for text and Amiri for Arabic.
 */
export const colors = {
  linen: '#F8F4EE', // screen background
  card: '#FFFDF9', // cards and the tab bar
  line: '#EADFD3', // borders and dividers
  sand: '#D9C8BA',
  tint: '#EFE4D8', // soft walnut background (icons, segmented control)
  walnut: '#855C49', // buttons and links
  espresso: '#3B2A24', // main text, prayer card
  gold: '#C49A6C', // decoration only, never text on light backgrounds
  goldText: '#E3CDB4', // text on the espresso card
  muted: '#6B5D55', // secondary text (passes 4.5:1 on linen)
  tabInactive: '#6E625B',
  sage: '#4C7A5D',
  sageDark: '#2F5A40',
  sageTint: '#E3EDE6',
  amberTint: '#F3E6D3',
  amberText: '#6B4A1E',
  brickTint: '#F6DCD3',
  brickText: '#7A3229',
  white: '#FFFDF9',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  arabic: 'Amiri_400Regular',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 24 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
