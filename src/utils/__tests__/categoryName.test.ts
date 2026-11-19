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

	it('leaves category names without translations unchanged', () => {
		expect(getCategoryDisplayName('My category', 'fi')).toBe('My category');
	});
});
