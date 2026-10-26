import type { RealTransaction } from '@/src/dataModel';

export const BALANCE_CORRECTION_NAMES = [
	'Balance correction',
	'Saldon korjaus',
] as const;
export const BALANCE_CORRECTION_CATEGORY_ID = 0;

export function mergeBalanceCorrections(
	existing: RealTransaction[],
	correction: RealTransaction,
): RealTransaction | undefined {
	// Sum signed cents so decimal rounding cannot skew the daily net.
	const totalInCents = existing.reduce(
		(sum, transaction) =>
			sum +
			(transaction.type === 'income'
				? Math.round(transaction.amount * 100)
				: -Math.round(transaction.amount * 100)),
		correction.type === 'income'
			? Math.round(correction.amount * 100)
			: -Math.round(correction.amount * 100),
	);

	if (totalInCents === 0) {
		return undefined;
	}

	return {
		...correction,
		amount: Math.abs(totalInCents) / 100,
		type: totalInCents > 0 ? 'income' : 'expense',
	};
}
