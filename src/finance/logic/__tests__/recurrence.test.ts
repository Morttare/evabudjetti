import type {
	Persisted,
	PlannedTransaction,
	RealTransaction,
} from '@/src/dataModel';
import {
	addRecurrence,
	firstPlannedOccurrenceAfter,
	nextPlannedOccurrence,
	plannedTransactionToOccurrence,
	realTransactionToOccurrence,
} from '../transactionOccurrencesLogic';

// Note: months are zero-based in the app (10 = November, 11 = December)

function planned(
	overrides: Partial<Persisted<PlannedTransaction>>,
): Persisted<PlannedTransaction> {
	return {
		id: 1,
		accountId: 1,
		categoryId: 0,
		name: 'Rent',
		amount: 480,
		type: 'expense',
		recurrenceBase: 'month',
		recurrenceInterval: 1,
		startDate: new Date(2026, 10, 3),
		endDate: null,
		...overrides,
	} as Persisted<PlannedTransaction>;
}

describe('addRecurrence', () => {
	const date = new Date(2026, 10, 6);

	it('adds days, weeks, months and years', () => {
		expect(addRecurrence(date, 'day', 10)).toEqual(new Date(2026, 10, 16));
		expect(addRecurrence(date, 'week', 4)).toEqual(new Date(2026, 11, 4));
		expect(addRecurrence(date, 'month', 2)).toEqual(new Date(2027, 0, 6));
		expect(addRecurrence(date, 'year', 1)).toEqual(new Date(2027, 10, 6));
	});

	it('moves to the last day of a shorter month', () => {
		// 31 January + 1 month -> 28 February
		expect(addRecurrence(new Date(2027, 0, 31), 'month', 1)).toEqual(
			new Date(2027, 1, 28),
		);
	});
});

describe('firstPlannedOccurrenceAfter', () => {
	it('returns the start date when it is after the given date', () => {
		const rent = planned({});

		expect(
			firstPlannedOccurrenceAfter(rent, new Date(2026, 9, 20)),
		).toEqual(new Date(2026, 10, 3));
	});

	it('returns the start date when it is on the given date', () => {
		const rent = planned({});

		expect(
			firstPlannedOccurrenceAfter(rent, new Date(2026, 10, 3)),
		).toEqual(new Date(2026, 10, 3));
	});

	it('returns the next monthly occurrence', () => {
		// Rent on the 3rd of every month; on 10 December the next one is 3 January
		const rent = planned({});

		expect(
			firstPlannedOccurrenceAfter(rent, new Date(2026, 11, 10)),
		).toEqual(new Date(2027, 0, 3));
	});

	it('returns the next occurrence for a 4-week interval', () => {
		// Daily allowance every 4 weeks from 6 November: 6.11., 4.12., 1.1.
		const dailyAllowance = planned({
			type: 'income',
			amount: 580,
			recurrenceBase: 'week',
			recurrenceInterval: 4,
			startDate: new Date(2026, 10, 6),
		});

		expect(
			firstPlannedOccurrenceAfter(dailyAllowance, new Date(2026, 10, 20)),
		).toEqual(new Date(2026, 11, 4));
	});

	it('returns undefined after the end date', () => {
		const ending = planned({ endDate: new Date(2026, 11, 31) });

		expect(
			firstPlannedOccurrenceAfter(ending, new Date(2027, 0, 10)),
		).toBeUndefined();
	});

	it('returns undefined for a one-time transaction in the past', () => {
		const oneTime = planned({ recurrenceBase: null });

		expect(
			firstPlannedOccurrenceAfter(oneTime, new Date(2026, 11, 1)),
		).toBeUndefined();
	});

	it('throws an error for an invalid recurrence interval', () => {
		const invalid = planned({ recurrenceInterval: 0 });

		expect(() =>
			firstPlannedOccurrenceAfter(invalid, new Date(2026, 11, 10)),
		).toThrow();
	});
});

describe('nextPlannedOccurrence', () => {
	it('returns the next occurrence', () => {
		const rent = planned({});

		expect(nextPlannedOccurrence(rent, new Date(2026, 10, 3))).toEqual(
			new Date(2026, 11, 3),
		);
	});

	it('returns undefined for a one-time transaction', () => {
		const oneTime = planned({ recurrenceBase: null });

		expect(
			nextPlannedOccurrence(oneTime, new Date(2026, 10, 3)),
		).toBeUndefined();
	});

	it('returns undefined when the next occurrence is after the end date', () => {
		const ending = planned({ endDate: new Date(2026, 11, 1) });

		expect(
			nextPlannedOccurrence(ending, new Date(2026, 10, 3)),
		).toBeUndefined();
	});
});

describe('transactions to occurrences', () => {
	it('converts a planned transaction to an occurrence', () => {
		const rent = planned({});
		const date = new Date(2026, 11, 3);

		expect(plannedTransactionToOccurrence(rent, date)).toEqual({
			amount: 480,
			categoryId: 0,
			type: 'expense',
			name: 'Rent',
			date,
			plannedTransaction: rent,
		});
	});

	it('converts a real transaction to an occurrence', () => {
		const groceries: Persisted<RealTransaction> = {
			id: 7,
			accountId: 1,
			categoryId: 2,
			name: 'Groceries',
			amount: 35,
			date: new Date(2026, 10, 12),
			type: 'expense',
			plannedTransactionId: null,
		};

		expect(realTransactionToOccurrence(groceries)).toEqual({
			amount: 35,
			categoryId: 2,
			type: 'expense',
			name: 'Groceries',
			date: new Date(2026, 10, 12),
			realTransaction: groceries,
		});
	});
});
