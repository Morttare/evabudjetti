export const DEFAULT_CATEGORIES = [
	{
		name: 'Asuminen/Living',
		type: 'expense',
		color: '#FF5733',
		icon: 'home',
	},
	{
		name: 'Kulkeminen/Transport',
		type: 'expense',
		color: '#33A1FF',
		icon: 'car',
	},
	{
		name: 'Terveydenhoito/Healthcare',
		type: 'expense',
		color: '#A133FF',
		icon: 'heart',
	},
	{
		name: 'Ruoka/Food',
		type: 'expense',
		color: '#33FF57',
		icon: 'cart',
	},
	{
		name: 'Etuudet/Benefits',
		type: 'income',
		color: '#FF33A1',
		icon: 'gift',
	},
] as const;
