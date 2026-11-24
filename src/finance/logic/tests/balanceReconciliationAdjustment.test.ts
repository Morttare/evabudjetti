import type { RealTransaction } from '@/src/dataModel';
import {
	getAffectedAccountIds,
	getBalanceReconciliationDeltaCents,
	getFirstAffectedDate,
} from '../balanceReconciliationAdjustment';

function transaction(
	amount: number,
	type: 'income' | 'expense',
	date: Date,
): RealTransaction {
	return {
		accountId: 1,
		categoryId: 1,
		name: 'Transaction',
		amount,
		type,
		date,
		plannedTransactionId: null,
	};
}

describe('getBalanceReconciliationDeltaCents', () => {
	const reconciliationDate = new Date(2026, 10, 4);

	it('propagates an amount edit to reconciliations after the transaction', () => {
		const previous = transaction(10, 'expense', new Date(2026, 10, 2));
		const updated = { ...previous, amount: 15 };

		expect(
			getBalanceReconciliationDeltaCents(
				1,
				reconciliationDate,
				[previous],
				[updated],
			),
		).toBe(-500);
	});

	it('does not change reconciliations before the transaction', () => {
		const previous = transaction(10, 'expense', new Date(2026, 10, 5));
		const updated = { ...previous, amount: 15 };

		expect(
			getBalanceReconciliationDeltaCents(
				1,
				reconciliationDate,
				[previous],
				[updated],
			),
		).toBe(0);
	});

	it('adjusts checkpoints based on when a transaction was moved', () => {
		const previous = transaction(10, 'income', new Date(2026, 10, 2));
		const updated = { ...previous, date: new Date(2026, 10, 6) };

		expect(
			getBalanceReconciliationDeltaCents(
				1,
				reconciliationDate,
				[previous],
				[updated],
			),
		).toBe(-1000);
	});

	it('rounds transaction deltas to cents and ignores other accounts', () => {
		const previous = transaction(0.1, 'income', new Date(2026, 10, 2));
		const updated = { ...previous, amount: 0.2, accountId: 2 };

		expect(
			getBalanceReconciliationDeltaCents(
				1,
				reconciliationDate,
				[previous],
				[updated],
			),
		).toBe(-10);
	});

	it('includes transactions on the reconciliation calendar day', () => {
		const reconciliationDate = new Date(2026, 10, 4, 12, 0);
		const previous = transaction(
			10,
			'expense',
			new Date(2026, 10, 4, 9, 0),
		);
		const updated = { ...previous, amount: 15 };

		expect(
			getBalanceReconciliationDeltaCents(
				1,
				reconciliationDate,
				[previous],
				[updated],
			),
		).toBe(-500);
	});
});

describe('affected reconciliation transactions', () => {
	it('returns each affected account once', () => {
		const previous = [
			transaction(10, 'expense', new Date(2026, 10, 2)),
			{
				...transaction(20, 'income', new Date(2026, 10, 3)),
				accountId: 2,
			},
		];
		const next = [
			{
				...transaction(15, 'expense', new Date(2026, 10, 4)),
				accountId: 3,
			},
		];

		expect(getAffectedAccountIds(previous, next)).toEqual([1, 2, 3]);
	});

	it('finds the earliest affected date across account changes', () => {
		const transactions = [
			transaction(10, 'expense', new Date(2026, 10, 8)),
			transaction(20, 'income', new Date(2026, 10, 3)),
		];

		expect(getFirstAffectedDate(transactions)).toEqual(
			new Date(2026, 10, 3),
		);
		expect(getFirstAffectedDate([])).toBeUndefined();
	});
});
