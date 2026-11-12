import type {
	PlannedTransaction,
	TransactionOccurrence,
} from '@/src/dataModel';
import {
	createDateKey,
	createMonthKey,
	dateToDateKey,
	dateToMonthKey,
	decodeMonthKey,
	getPreviousMonth,
	getSignedOccurrenceAmount,
	monthIsInRange,
	monthKeyToDate,
	monthsInRange,
	plannedTransactionIsActiveInMonth,
} from '../util';

// Note: months are zero-based in the app (0 = January, 11 = December)

describe('month and date keys', () => {
	it('creates a zero-padded month key', () => {
		expect(createMonthKey(2026, 0)).toBe('2026-01');
		expect(createMonthKey(2026, 11)).toBe('2026-12');
	});

	it('creates a zero-padded date key', () => {
		expect(createDateKey(2026, 10, 6)).toBe('2026-11-06');
		expect(createDateKey(2026, 11, 31)).toBe('2026-12-31');
	});

	it('converts a date to month and date keys', () => {
		const date = new Date(2026, 10, 6);

		expect(dateToMonthKey(date)).toBe('2026-11');
		expect(dateToDateKey(date)).toBe('2026-11-06');
	});

	it('decodes a month key back to year and zero-based month', () => {
		expect(decodeMonthKey('2026-11')).toEqual({ year: 2026, month: 10 });
		expect(decodeMonthKey('2027-01')).toEqual({ year: 2027, month: 0 });
	});

	it('converts a month key to the first day of the month', () => {
		expect(monthKeyToDate('2026-11')).toEqual(new Date(2026, 10, 1));
	});
});

describe('monthIsInRange', () => {
	it('returns true for months inside the range', () => {
		// Range: November 2026 – March 2027
		expect(monthIsInRange(2026, 10, 2026, 10, 2027, 2)).toBe(true);
		expect(monthIsInRange(2027, 0, 2026, 10, 2027, 2)).toBe(true);
		expect(monthIsInRange(2027, 2, 2026, 10, 2027, 2)).toBe(true);
	});

	it('returns false for months outside the range', () => {
		expect(monthIsInRange(2026, 9, 2026, 10, 2027, 2)).toBe(false);
		expect(monthIsInRange(2027, 3, 2026, 10, 2027, 2)).toBe(false);
	});

	it('handles a range across the year boundary', () => {
		// December 2026 is in the range November 2026 – January 2027
		expect(monthIsInRange(2026, 11, 2026, 10, 2027, 0)).toBe(true);
		// December 2025 is not, even though the month number is in between
		expect(monthIsInRange(2025, 11, 2026, 10, 2027, 0)).toBe(false);
	});
});

describe('monthsInRange', () => {
	it('lists all months in a range', () => {
		expect(monthsInRange(2026, 8, 2026, 10)).toEqual([
			{ year: 2026, month: 8 },
			{ year: 2026, month: 9 },
			{ year: 2026, month: 10 },
		]);
	});

	it('lists months across the year boundary', () => {
		expect(monthsInRange(2026, 10, 2027, 1)).toEqual([
			{ year: 2026, month: 10 },
			{ year: 2026, month: 11 },
			{ year: 2027, month: 0 },
			{ year: 2027, month: 1 },
		]);
	});

	it('returns one month when start and end are the same', () => {
		expect(monthsInRange(2026, 10, 2026, 10)).toEqual([
			{ year: 2026, month: 10 },
		]);
	});

	it('returns an empty list when start is after end', () => {
		expect(monthsInRange(2027, 0, 2026, 11)).toEqual([]);
	});
});

describe('getPreviousMonth', () => {
	it('returns the previous month', () => {
		expect(getPreviousMonth({ year: 2026, month: 10 })).toEqual({
			year: 2026,
			month: 9,
		});
	});

	it('returns December of the previous year for January', () => {
		expect(getPreviousMonth({ year: 2027, month: 0 })).toEqual({
			year: 2026,
			month: 11,
		});
	});
});

describe('getSignedOccurrenceAmount', () => {
	const occurrence = (type: 'income' | 'expense'): TransactionOccurrence => ({
		name: 'Test',
		categoryId: 0,
		amount: 580,
		date: new Date(2026, 10, 6),
		type,
	});

	it('returns a positive amount for income', () => {
		expect(getSignedOccurrenceAmount(occurrence('income'))).toBe(580);
	});

	it('returns a negative amount for expense', () => {
		expect(getSignedOccurrenceAmount(occurrence('expense'))).toBe(-580);
	});
});

describe('plannedTransactionIsActiveInMonth', () => {
	function planned(
		overrides: Partial<PlannedTransaction>,
	): PlannedTransaction {
		return {
			accountId: 1,
			categoryId: 0,
			name: 'Test',
			amount: 100,
			type: 'expense',
			recurrenceBase: 'month',
			recurrenceInterval: 1,
			startDate: new Date(2026, 10, 15),
			endDate: null,
			...overrides,
		} as PlannedTransaction;
	}

	it('one-time transaction is active only in its start month', () => {
		const oneTime = planned({ recurrenceBase: null });

		expect(plannedTransactionIsActiveInMonth(oneTime, '2026-10')).toBe(
			false,
		);
		expect(plannedTransactionIsActiveInMonth(oneTime, '2026-11')).toBe(
			true,
		);
		expect(plannedTransactionIsActiveInMonth(oneTime, '2026-12')).toBe(
			false,
		);
	});

	it('recurring transaction is active from its start month onwards', () => {
		const recurring = planned({});

		expect(plannedTransactionIsActiveInMonth(recurring, '2026-10')).toBe(
			false,
		);
		expect(plannedTransactionIsActiveInMonth(recurring, '2026-11')).toBe(
			true,
		);
		expect(plannedTransactionIsActiveInMonth(recurring, '2027-06')).toBe(
			true,
		);
	});

	it('recurring transaction is not active after its end date', () => {
		const ending = planned({ endDate: new Date(2027, 2, 10) });

		expect(plannedTransactionIsActiveInMonth(ending, '2027-03')).toBe(true);
		expect(plannedTransactionIsActiveInMonth(ending, '2027-04')).toBe(
			false,
		);
	});
});
