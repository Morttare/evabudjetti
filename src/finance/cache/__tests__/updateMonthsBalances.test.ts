// The balance cache imports database queries and the occurrence cache.
// They are not needed here, so they are replaced with empty mocks.
jest.mock('../../query/balanceReconciliationQueries', () => ({
	fetchBalanceReconciliationsBeforeOrIn: jest.fn(),
}));
jest.mock('../transactionOccurrencesCache', () => ({
	useTransactionOccurrencesCache: { getState: jest.fn() },
}));

import type { AccountBalanceMonthData } from '@/src/dataModel';
import {
	type AccountBalanceMonthCacheData,
	type BalanceCacheState,
	updateMonthsBalances,
} from '../balanceCache';

/** Calculated balances for a month: start, end and no daily rows */
function monthBalance(
	monthKey: string,
	startBalance: number,
	endBalance: number,
): AccountBalanceMonthData {
	return { monthKey, startBalance, endBalance, dailyBalances: [] };
}

function cached(
	data: AccountBalanceMonthData,
	version: number,
): AccountBalanceMonthCacheData {
	return { ...data, version };
}

/** Cache state containing the given months */
function cacheWith(...months: AccountBalanceMonthCacheData[]) {
	return {
		dataByMonth: new Map(months.map((m) => [m.monthKey, m])),
	} as BalanceCacheState;
}

describe('updateMonthsBalances', () => {
	it('adds a month that is not in the cache yet', () => {
		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 560)],
			new Map([['2026-11', 1]]),
			cacheWith(),
		);

		expect(result.dataByMonth?.get('2026-11')).toEqual({
			monthKey: '2026-11',
			startBalance: 0,
			endBalance: 560,
			dailyBalances: [],
			version: 1,
		});
	});

	it('replaces a month whose cached version is out of date', () => {
		// November was cached at version 1; a new expense raised the version to 2
		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 520)],
			new Map([['2026-11', 2]]),
			cacheWith(cached(monthBalance('2026-11', 0, 560), 1)),
		);

		expect(result.dataByMonth?.get('2026-11')?.endBalance).toBe(520);
		expect(result.dataByMonth?.get('2026-11')?.version).toBe(2);
	});

	it('keeps a month whose cached version is already up to date', () => {
		const fresh = cached(monthBalance('2026-11', 0, 560), 2);

		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 999)],
			new Map([['2026-11', 2]]),
			cacheWith(fresh),
		);

		expect(result.dataByMonth?.get('2026-11')).toBe(fresh);
	});

	it('keeps a month whose cached version is newer than the update', () => {
		// A slower, older calculation must not overwrite newer data
		const newer = cached(monthBalance('2026-11', 0, 520), 3);

		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 560)],
			new Map([['2026-11', 2]]),
			cacheWith(newer),
		);

		expect(result.dataByMonth?.get('2026-11')).toBe(newer);
	});

	it('uses version 0 for a month without a known version', () => {
		const result = updateMonthsBalances(
			[monthBalance('2026-12', 560, 80)],
			new Map(),
			cacheWith(),
		);

		expect(result.dataByMonth?.get('2026-12')?.version).toBe(0);
	});

	it('updates only the out-of-date months and keeps the others', () => {
		const october = cached(monthBalance('2026-10', 100, 0), 1);
		const november = cached(monthBalance('2026-11', 0, 560), 1);

		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 520), monthBalance('2026-12', 520, 40)],
			new Map([
				['2026-11', 2],
				['2026-12', 1],
			]),
			cacheWith(october, november),
		);

		expect(result.dataByMonth?.get('2026-10')).toBe(october);
		expect(result.dataByMonth?.get('2026-11')?.endBalance).toBe(520);
		expect(result.dataByMonth?.get('2026-12')?.endBalance).toBe(40);
	});

	it('does not change the existing cache state', () => {
		const state = cacheWith(cached(monthBalance('2026-11', 0, 560), 1));

		const result = updateMonthsBalances(
			[monthBalance('2026-11', 0, 520)],
			new Map([['2026-11', 2]]),
			state,
		);

		expect(result.dataByMonth).not.toBe(state.dataByMonth);
		expect(state.dataByMonth.get('2026-11')?.endBalance).toBe(560);
	});
});
