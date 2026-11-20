import type { PlannedTransaction } from '@/src/dataModel';
import { getTransactionOccurrenceCount } from '../util';

// Note: months are zero-based in the app (10 = November, 11 = December)

function planned(overrides: Partial<PlannedTransaction>): PlannedTransaction {
	return {
		accountId: 1,
		categoryId: 0,
		name: 'Test',
		amount: 100,
		type: 'expense',
		recurrenceBase: 'month',
		recurrenceInterval: 1,
		// Monday 2 November 2026
		startDate: new Date(2026, 10, 2),
		endDate: null,
		...overrides,
	} as PlannedTransaction;
}

describe('getTransactionOccurrenceCount', () => {
	it('returns 0 before the start month', () => {
		expect(getTransactionOccurrenceCount(planned({}), 2026, 9)).toBe(0);
	});

	it('returns 0 after the end month', () => {
		const ending = planned({ endDate: new Date(2027, 0, 15) });

		expect(getTransactionOccurrenceCount(ending, 2027, 0)).toBe(1);
		expect(getTransactionOccurrenceCount(ending, 2027, 1)).toBe(0);
	});

	it('counts a one-time transaction only in its start month', () => {
		const oneTime = planned({ recurrenceBase: null });

		expect(getTransactionOccurrenceCount(oneTime, 2026, 10)).toBe(1);
		expect(getTransactionOccurrenceCount(oneTime, 2026, 11)).toBe(0);
	});

	it('counts a monthly transaction once per month', () => {
		// Rent 480 € every month
		const rent = planned({ amount: 480 });

		expect(getTransactionOccurrenceCount(rent, 2026, 10)).toBe(1);
		expect(getTransactionOccurrenceCount(rent, 2026, 11)).toBe(1);
		expect(getTransactionOccurrenceCount(rent, 2027, 5)).toBe(1);
	});

	it('counts a transaction every second month', () => {
		// Electricity transfer every other month from November
		const electricity = planned({ recurrenceInterval: 2 });

		expect(getTransactionOccurrenceCount(electricity, 2026, 10)).toBe(1);
		expect(getTransactionOccurrenceCount(electricity, 2026, 11)).toBe(0);
		expect(getTransactionOccurrenceCount(electricity, 2027, 0)).toBe(1);
	});

	it('counts a yearly transaction only in its start month', () => {
		const membership = planned({ recurrenceBase: 'year' });

		expect(getTransactionOccurrenceCount(membership, 2026, 10)).toBe(1);
		expect(getTransactionOccurrenceCount(membership, 2027, 0)).toBe(0);
		expect(getTransactionOccurrenceCount(membership, 2027, 10)).toBe(1);
	});

	it('counts weekly expenses by actual weekdays in the month', () => {
		// Every Monday from 2 November 2026
		const weekly = planned({ recurrenceBase: 'week' });

		// November: 2, 9, 16, 23, 30
		expect(getTransactionOccurrenceCount(weekly, 2026, 10)).toBe(5);
		// December: 7, 14, 21, 28
		expect(getTransactionOccurrenceCount(weekly, 2026, 11)).toBe(4);
	});

	it('counts daily expenses by days in the month', () => {
		const daily = planned({ recurrenceBase: 'day' });

		// November: 2.–30.
		expect(getTransactionOccurrenceCount(daily, 2026, 10)).toBe(29);
		// December: all 31 days
		expect(getTransactionOccurrenceCount(daily, 2026, 11)).toBe(31);
	});

	it('counts an income every 4 weeks by actual payment dates', () => {
		// Customer example: daily allowance every 4 weeks from 6 November 2026
		const dailyAllowance = planned({
			type: 'income',
			amount: 580,
			recurrenceBase: 'week',
			recurrenceInterval: 4,
			startDate: new Date(2026, 10, 6),
		});

		// November: 6.
		expect(getTransactionOccurrenceCount(dailyAllowance, 2026, 10)).toBe(1);
		// December: 4.
		expect(getTransactionOccurrenceCount(dailyAllowance, 2026, 11)).toBe(1);
		// January: 1. and 29.
		expect(getTransactionOccurrenceCount(dailyAllowance, 2027, 0)).toBe(2);
	});

	it('returns a monthly average for weekly income', () => {
		// Current behaviour: weekly income (interval under 4 weeks) is counted
		// as an average of 365 / 7 / 12 ≈ 4.35 times a month, not by actual dates.
		// To be confirmed with the team whether this is intended.
		const weeklyIncome = planned({
			type: 'income',
			recurrenceBase: 'week',
		});

		expect(
			getTransactionOccurrenceCount(weeklyIncome, 2026, 10),
		).toBeCloseTo(365 / 7 / 12);
	});
});
