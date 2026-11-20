import type { AccountBalanceMonthData } from '@/src/dataModel';
import { calculateUsableFundsPerDayForDateRange } from '../usableFundsLogic';

/**
 * Builds the balance data of one month.
 * @param monthKey Month in the format "YYYY-MM", e.g. "2026-11"
 * @param daysInMonth Number of days in the month
 * @param balanceOnDay Returns the end-of-day balance for a day of the month (1-based)
 */
function month(
	monthKey: string,
	daysInMonth: number,
	balanceOnDay: (day: number) => number,
): AccountBalanceMonthData {
	return {
		monthKey,
		dailyBalances: Array.from({ length: daysInMonth }, (_, i) => ({
			balance: balanceOnDay(i + 1),
			isReconciled: false,
		})),
	};
}

describe('calculateUsableFundsPerDayForDateRange', () => {
	it('divides the balance evenly when nothing changes during the timeframe', () => {
		// 300 € for 1.–30.11. -> 10 €/day
		const november = month('2026-11', 30, () => 300);

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			1,
			2026,
			10,
			30,
			[november],
		);

		expect(result).toBeCloseTo(10);
	});

	it('limits usable funds when the next income comes later in the timeframe', () => {
		// 100 € until 9.11., income on 10.11. raises the balance to 700 €.
		// The average would be 700 / 30 = 23.33 €/day, but before the income
		// there is only 100 € for 9 days -> 11.11 €/day (customer: "tulosta tuloon")
		const november = month('2026-11', 30, (day) => (day < 10 ? 100 : 700));

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			1,
			2026,
			10,
			30,
			[november],
		);

		expect(result).toBeCloseTo(100 / 9);
	});

	it('reserves money for a large expense later in the timeframe', () => {
		// 600 € until 19.11., rent 500 € on 20.11. -> 100 € must last 30 days
		const november = month('2026-11', 30, (day) => (day < 20 ? 600 : 100));

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			1,
			2026,
			10,
			30,
			[november],
		);

		expect(result).toBeCloseTo(100 / 30);
	});

	it('calculates a timeframe that continues to the next month', () => {
		// 20.11.–10.12. = 21 days, balance 420 € -> 20 €/day
		const november = month('2026-11', 30, () => 420);
		const december = month('2026-12', 31, () => 420);

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			20,
			2026,
			11,
			10,
			[november, december],
		);

		expect(result).toBeCloseTo(20);
	});

	it('returns 0 when the balance goes negative during the timeframe', () => {
		const november = month('2026-11', 30, (day) => (day < 15 ? 200 : -50));

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			1,
			2026,
			10,
			30,
			[november],
		);

		expect(result).toBe(0);
	});

	it('returns 0 when balance data for a month is missing', () => {
		// December is not calculated yet
		const november = month('2026-11', 30, () => 420);

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			20,
			2026,
			11,
			10,
			[november],
		);

		expect(result).toBe(0);
	});

	it('returns 0 when a daily balance in the timeframe is unknown', () => {
		// The balance of 3.11. is not known
		const november = month('2026-11', 30, () => 300);
		november.dailyBalances[2] = undefined;

		const result = calculateUsableFundsPerDayForDateRange(
			2026,
			10,
			1,
			2026,
			10,
			30,
			[november],
		);

		expect(result).toBe(0);
	});
});
