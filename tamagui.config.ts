import { createFont, createTamagui, createTokens } from 'tamagui';

const firaFont = createFont({
	family: 'FiraSans_400Regular',
	size: {
		body: 16,
		subtitle: 12,
		title3: 14,
		title2: 17,
		title1: 22,
		// button sizes
		'buttons.sm': 14,
		'buttons.md': 16,
		'buttons.lg': 18,
		1: 11,
		2: 12,
		3: 13,
		4: 14,
		true: 16,
		5: 17,
		6: 18,
		7: 20,
		8: 22,
		9: 30,
		10: 50,
	},
	lineHeight: {
		2: 22,
	},
	weight: {
		1: '300', // Corresponds to Light
		true: '400', // Corresponds to Regular
		3: '500', // Corresponds to Medium
		4: '600', // Corresponds to SemiBold
		5: '700', // Corresponds to Bold
		6: '800', // Corresponds to ExtraBold
	},
	letterSpacing: {
		1: 0,
		2: -1,
		true: 0,
	},

	face: {
		300: { normal: 'FiraSans_300Light' },
		400: { normal: 'FiraSans_400Regular' },
		500: { normal: 'FiraSans_500Medium' },
		600: { normal: 'FiraSans_600SemiBold' },
		700: { normal: 'FiraSans_700Bold' },
		800: { normal: 'FiraSans_800ExtraBold' },
	},
});

// Set up tokens
const size = {
	popupMaxWidth: 320,
	tabItemHeight: 48,
	// Button sizes (now part of size tokens)
	'buttons.sm': 24,
	'buttons.md': 32,
	'buttons.lg': 42,
	'buttons.xl': 52,
	paddingmd: 5,
	0: 0,
	1: 5,
	2: 10,
	3: 15,
	4: 20,
	true: 20,
	5: 25,
	6: 30,
	7: 35,
	8: 40,
	9: 45,
	10: 50,
};

const icons = {
	sm: 20,
	md: 24,
	lg: 30,
	xl: 34,
};

const color = {
	// correct colors according to mockup
	primary100: '#0A5B55',
	primary200: '#3AA18D',
	primary300: '#D2EFE9',
	background100: '#fff',

	success500: '#4CAF50',
	caution: '#FFE3A6',
	danger500: '#F44336',
	info500: '#2196F3',
	red10: '#E53535',

	black: '#000',
	white: '#fff',
	disabled: '#636363ff',

	backgroundColor: '#fff',
	borderColor: '#000',

	backgroundFocus: '#fff',
	// Input border highlight color
	borderColorFocus: '$primary200',

	// Required for button states on Android
	transparent: 'rgba(0,0,0,0)',
};

export const tokens = createTokens({
	size,
	color,
	icons,
	space: {
		...size,
		'-1': -5,
		'-2': -10,
	},
	radius: {
		0: 0,
		1: 3,
		2: 10,
		true: 15,
		4: 40,
	},
	zIndex: { 0: 0, 1: 100, 2: 200 },
});

const light = {
	background: tokens.color.white,
	lightText: tokens.color.white,
	backgroundStrong: tokens.color.primary100,
	color: tokens.color.black,
	colorStrong: tokens.color.black,

	borderColor: tokens.color.black,
	buttonColor: tokens.color.primary200,
	buttonBg: tokens.color.primary200,

	caution: tokens.color.caution,
	danger: tokens.color.danger500,
	info: tokens.color.info500,
	success: tokens.color.success500,

	// ADDED -Required button state tokens for Android
	backgroundHover: tokens.color.primary300,
	backgroundPress: tokens.color.primary300,
	borderColorHover: tokens.color.primary300,
	borderColorPress: tokens.color.primary300,
	colorHover: tokens.color.primary300,
	colorPress: tokens.color.primary200,
};

const configDefinition = {
	fonts: {
		heading: firaFont,
		body: firaFont,
	},
	tokens,
	themes: {
		light,
		dark: {
			background: '#111',
			color: '#EEFFF6',
			// values just to silence warning
			backgroundHover: '#222',
			backgroundPress: '#000',
			borderColorHover: '#333',
			borderColorPress: '#111',
		},
	},
	media: {
		sm: { maxWidth: 860 },
		gtSm: { minWidth: 860 + 1 },
		short: { maxHeight: 820 },
		hoverNone: { hover: 'none' },
		pointerCoarse: { pointer: 'coarse' },
	},

	// Shorthands
	// Adds <View m={10} /> to <View margin={10} />
	// See Settings section on this page to only allow shorthands
	// Be sure to have `as const` at the end
	shorthands: {
		px: 'paddingHorizontal',
		f: 'flex',
		m: 'margin',
		w: 'width',
		jc: 'justifyContent',
		ac: 'alignContent',
		ta: 'textAlign',
		ai: 'alignItems',
		mt: 'marginTop',
		mb: 'marginBottom',
		ml: 'marginLeft',
		mr: 'marginRight',
		pb: 'paddingBottom',
	} as const,

	// Allow text scaling for accessibility, capped to avoid layout breakage.
	// Button text remains fixed to preserve the established button layout.
	defaultProps: {
		Text: {
			allowFontScaling: true,
			maxFontSizeMultiplier: 1.2,
		},
		Paragraph: {
			allowFontScaling: true,
			maxFontSizeMultiplier: 1.2,
		},

		Button: {
			allowFontScaling: false,
			maxFontSizeMultiplier: 1.0,
		},
	},
} as const;

type AppConfig = typeof configDefinition;

// this will give you types for your components
// note - if using your own design system, put the package name here instead of tamagui
declare module 'tamagui' {
	interface TamaguiCustomConfig extends AppConfig {}

	// if you want types for group styling props, define them like so:
	interface TypeOverride {
		groupNames(): 'card';
	}
}

const config = createTamagui(configDefinition);

export default config;
