import { getCategoryDisplayName } from '../categoryName';

describe('getCategoryDisplayName', () => {
	it('selects the Finnish label for Finnish locales', () => {
		expect(getCategoryDisplayName('Asuminen/Living', 'fi-FI')).toBe(
			'Asuminen',
		);
	});

	it('selects the English label for English locales', () => {
		expect(getCategoryDisplayName('Asuminen/Living', 'en-US')).toBe(
			'Living',
		);
	});

	it('does not translate user category names, even if they contain a slash', () => {
		expect(getCategoryDisplayName('Transport/Bus', 'fi')).toBe(
			'Transport/Bus',
		);
	});

	it('leaves category names without translations unchanged', () => {
		expect(getCategoryDisplayName('My category', 'fi')).toBe('My category');
	});
});
