const DEFAULT_CATEGORY_TRANSLATIONS = new Map([
	['Asuminen/Living', { fi: 'Asuminen', en: 'Living' }],
	['Kulkeminen/Transport', { fi: 'Kulkeminen', en: 'Transport' }],
	['Terveydenhoito/Healthcare', { fi: 'Terveydenhoito', en: 'Healthcare' }],
	['Ruoka/Food', { fi: 'Ruoka', en: 'Food' }],
	['Etuudet/Benefits', { fi: 'Etuudet', en: 'Benefits' }],
]);

export function getCategoryDisplayName(name: string, language: string): string {
	const translation = DEFAULT_CATEGORY_TRANSLATIONS.get(name);
	if (!translation) return name;

	return language.startsWith('fi') ? translation.fi : translation.en;
}
