import { getDaysInMonth } from 'date-fns';
import type { AccountBalanceMonthData } from '@/src/dataModel';
import { createMonthKey, monthsInRange } from './util';

// For the given date range, calculate the maximum amount of money
// the user can spend per day (assuming maximum amount is spent each day)
export function calculateUsableFundsPerDayForDateRange(
	startYear: number,
	startMonth: number,
	startDay: number,
	endYear: number,
	endMonth: number,
	endDay: number,
	balanceMonthDatas: AccountBalanceMonthData[],
): number {
	const balancesByMonthKey = new Map<string, AccountBalanceMonthData>();
	for (const monthData of balanceMonthDatas) {
		balancesByMonthKey.set(monthData.monthKey, monthData);
	}

	let dayIndex = 0;
	let usableFundsPerDay = Number.POSITIVE_INFINITY;

	for (const { year, month } of monthsInRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
	)) {
		const monthData = balancesByMonthKey.get(createMonthKey(year, month));

		if (monthData === undefined) {
			return 0;
		}

		const monthStartDay =
			year === startYear && month === startMonth ? startDay : 1;
		const monthEndDay =
			year === endYear && month === endMonth
				? endDay
				: getDaysInMonth(new Date(year, month));

		for (let day = monthStartDay; day <= monthEndDay; day++) {
			const dailyBalance = monthData.dailyBalances[day - 1];

			if (dailyBalance === undefined) {
				return 0;
			}

			dayIndex += 1;
			const maxForDay = dailyBalance.balance / dayIndex;
			usableFundsPerDay = Math.min(usableFundsPerDay, maxForDay);
		}
	}

	if (dayIndex === 0 || !Number.isFinite(usableFundsPerDay)) {
		return 0;
	}

	return Math.max(0, usableFundsPerDay);
}
