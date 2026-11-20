export function getCategoryDisplayName(name: string, language: string): string {
	const separatorIndex = name.indexOf('/');
	if (separatorIndex === -1) return name;

	const finnishName = name.slice(0, separatorIndex).trim();
	const englishName = name.slice(separatorIndex + 1).trim();
	return language.startsWith('fi') ? finnishName : englishName;
}
