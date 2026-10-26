import type { RealTransaction } from '@/src/dataModel';
import { mergeBalanceCorrections } from '../balanceCorrection';

function correction(
	amount: number,
	type: 'income' | 'expense',
): RealTransaction {
	return {
		accountId: 0,
		name: 'Balance correction',
		categoryId: 0,
		amount,
		date: new Date(2026, 9, 26),
		type,
		plannedTransactionId: null,
	};
}

describe('mergeBalanceCorrections', () => {
	it('combines same-day corrections into one net event', () => {
		const merged = mergeBalanceCorrections(
			[correction(10, 'income'), correction(3, 'expense')],
			correction(5, 'income'),
		);

		expect(merged).toMatchObject({ amount: 12, type: 'income' });
	});

	it('changes the event type when the net correction is negative', () => {
		const merged = mergeBalanceCorrections(
			[correction(8, 'expense')],
			correction(3, 'income'),
		);

		expect(merged).toMatchObject({ amount: 5, type: 'expense' });
	});

	it('returns no event when corrections net to zero', () => {
		const merged = mergeBalanceCorrections(
			[correction(10, 'income')],
			correction(10, 'expense'),
		);

		expect(merged).toBeUndefined();
	});

	it('sums decimal amounts in cents', () => {
		const merged = mergeBalanceCorrections(
			[correction(0.1, 'income')],
			correction(0.2, 'income'),
		);

		expect(merged?.amount).toBe(0.3);
	});
});
