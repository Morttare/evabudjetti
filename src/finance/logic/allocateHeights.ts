export const CARD_GAP = 16;

export function allocateHeights(
	available: number,
	incomeNeed: number,
	expenseNeed: number,
): { income?: number; expense?: number } {
	const usable = available - CARD_GAP;
	if (usable <= 0) return {};

	// Everything fits: no constraint, nothing scrolls
	if (incomeNeed + expenseNeed <= usable) return {};

	const half = usable / 2;
	if (incomeNeed <= half) {
		return { income: incomeNeed, expense: usable - incomeNeed };
	}
	if (expenseNeed <= half) {
		return { income: usable - expenseNeed, expense: expenseNeed };
	}
	return { income: half, expense: half };
}
