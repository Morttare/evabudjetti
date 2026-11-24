import { create } from 'zustand';
import type {
	AccountBalanceMonthData,
	BalanceReconciliation,
	MonthInstance,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import {
	calculateBalanceDatasForMonths,
	calculateStartingBalanceForMonth,
} from '../logic/balanceLogic';
import { createMonthKey, getPreviousMonth, monthsInRange } from '../logic/util';
import { fetchBalanceReconciliationsBeforeOrIn } from '../query/balanceReconciliationQueries';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';
import { useTransactionOccurrencesCache } from './transactionOccurrencesCache';

export interface AccountBalanceMonthCacheData extends AccountBalanceMonthData {
	/** Version of the month at the time of the cache update */
	version: number;
}

export interface BalanceCacheState {
	dataByMonth: Map<string, AccountBalanceMonthCacheData>;

	updateBalanceCacheForMonths: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
		monthVersions: Map<string, number>,
	) => Promise<BalanceCacheState>;
	getMonth: (monthKey: string) => AccountBalanceMonthCacheData;
}

export interface BalanceCacheStateUpdate {
	dataByMonth: Map<string, AccountBalanceMonthCacheData>;
}

export const useBalanceCache = create<BalanceCacheState>((set, get) => ({
	dataByMonth: new Map(),

	updateBalanceCacheForMonths: async (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
		monthVersions: Map<string, number>,
	) => {
		const oldCacheState = get();
		const monthUpdates = await updateBalanceCacheForMonths(
			startYear,
			startMonth,
			endYear,
			endMonth,
			monthVersions,
			oldCacheState,
		);

		if (monthUpdates.length === 0) {
			// No months were updated, do not change the state
			return oldCacheState;
		}

		set((state) =>
			updateMonthsBalances(monthUpdates, monthVersions, state),
		);

		return get();
	},

	getMonth: (monthKey: string) => {
		const monthData = get().dataByMonth.get(monthKey);

		if (monthData === undefined) {
			return getCachedEmptyMonthData(monthKey);
		}

		return monthData;
	},
}));

/**
 * Recalculates the oldest stale month and every later month in the requested range.
 * Returns no updates when the existing cache is already current.
 */
export async function updateBalanceCacheForMonths(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	monthVersions: Map<string, number>,
	oldCacheState: BalanceCacheState,
): Promise<AccountBalanceMonthCacheData[]> {
	const start = performance.now();
	const firstMonthToUpdate = findFirstMonthNeedingUpdate(
		startYear,
		startMonth,
		endYear,
		endMonth,
		monthVersions,
		oldCacheState,
	);

	if (firstMonthToUpdate === undefined) {
		// No months need updating, return an empty update to avoid unnecessary state updates
		return [];
	}

	console.debug(
		`[BalanceCache] Updating balance cache for months ${createMonthKey(
			firstMonthToUpdate.year,
			firstMonthToUpdate.month,
		)} to ${createMonthKey(endYear, endMonth)}`,
	);

	const monthBeforeFirstToUpdate = getPreviousMonth(firstMonthToUpdate);
	const monthBeforeFirstToUpdateKey = createMonthKey(
		monthBeforeFirstToUpdate.year,
		monthBeforeFirstToUpdate.month,
	);
	const monthBeforeFirstToUpdateData = oldCacheState.dataByMonth.get(
		monthBeforeFirstToUpdateKey,
	);
	const monthBeforeFirstToUpdateVersion =
		monthVersions.get(monthBeforeFirstToUpdateKey) ?? 0;

	const startingBalanceIsFresh =
		monthBeforeFirstToUpdateData !== undefined &&
		monthBeforeFirstToUpdateData.version >=
			monthBeforeFirstToUpdateVersion &&
		monthBeforeFirstToUpdateData.endBalance !== undefined;

	const balanceReconciliations = await fetchBalanceReconciliationsBeforeOrIn(
		endYear,
		endMonth,
	);
	const relevantReconciliations = findRelevantReconciliations(
		balanceReconciliations,
		firstMonthToUpdate,
	);

	if (relevantReconciliations === undefined) {
		// Cache empty data for the months in the range to avoid trying to update them again before we have a reconciliation
		return getEmptyDataFillingMonthUpdates(
			firstMonthToUpdate.year,
			firstMonthToUpdate.month,
			endYear,
			endMonth,
			monthVersions,
		);
	}

	let anchorReconciliation: BalanceReconciliation | undefined;
	let adjustedStartYear = firstMonthToUpdate.year;
	let adjustedStartMonth = firstMonthToUpdate.month;

	// If the starting balance is stale, extend the occurrence range back to an anchor reconciliation.
	if (!startingBalanceIsFresh) {
		anchorReconciliation = relevantReconciliations[0];
		const anchorReconciliationStartDate = relevantReconciliations[0].date;
		adjustedStartYear = anchorReconciliationStartDate.getFullYear();
		adjustedStartMonth = anchorReconciliationStartDate.getMonth();
	}

	// Make sure we have the necessary occurrences data for the months we need to update
	const transactionOccurrencesVersioningState =
		useTransactionOccurrenceVersioning.getState();
	transactionOccurrencesVersioningState.ensureTrackingInRange(
		adjustedStartYear,
		adjustedStartMonth,
		endYear,
		endMonth,
	);
	const neededOccurrencesVersions =
		transactionOccurrencesVersioningState.getVersionsByMonth(
			adjustedStartYear,
			adjustedStartMonth,
			endYear,
			endMonth,
		);

	console.debug(
		`[BalanceCache] About to call updateTransactionOccurrencesCacheForMonths with versions:`,
		{
			months: Array.from(neededOccurrencesVersions.entries()),
		},
	);

	const transactionOccurrencesData = await useTransactionOccurrencesCache
		.getState()
		.updateTransactionOccurrencesCacheForMonths(
			adjustedStartYear,
			adjustedStartMonth,
			endYear,
			endMonth,
			neededOccurrencesVersions,
		);

	const startingBalanceData = resolveStartingBalance(
		startingBalanceIsFresh,
		monthBeforeFirstToUpdateData,
		anchorReconciliation,
		firstMonthToUpdate,
		transactionOccurrencesData.dataByMonth,
	);
	const {
		amount: startingBalance,
		month: startingBalanceMonth,
		dayOfMonth: startingBalanceDayOfMonth,
	} = startingBalanceData;

	const monthUpdates = [];

	// Cache empty data for any months in the range before the reconciliation,
	// to avoid trying to update them again before we can calculate meaningful balances for them
	for (const { year, month } of monthsInRange(
		firstMonthToUpdate.year,
		firstMonthToUpdate.month,
		startingBalanceMonth.year,
		startingBalanceMonth.month,
	)) {
		// Skip the starting month since the calculation below handles it
		if (
			year === startingBalanceMonth.year &&
			month === startingBalanceMonth.month
		) {
			break;
		}

		const monthKey = createMonthKey(year, month);

		monthUpdates.push(
			getCachedEmptyMonthData(monthKey, monthVersions.get(monthKey) ?? 0),
		);
	}

	monthUpdates.push(
		...calculateBalanceDatasForMonths(
			transactionOccurrencesData.dataByMonth,
			relevantReconciliations,
			startingBalance,
			startingBalanceDayOfMonth,
			startingBalanceMonth,
			{ year: endYear, month: endMonth },
		),
	);

	console.debug(
		`[BalanceCache] Calculated balance cache updates for months ${createMonthKey(
			firstMonthToUpdate.year,
			firstMonthToUpdate.month,
		)} to ${createMonthKey(endYear, endMonth)} in ${performance.now() - start} ms`,
	);

	return monthUpdates.map((monthData) => ({
		...monthData,
		version: monthVersions.get(monthData.monthKey) ?? 0,
	}));
}

function findFirstMonthNeedingUpdate(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	monthVersions: Map<string, number>,
	oldCacheState: BalanceCacheState,
): MonthInstance | undefined {
	for (const month of monthsInRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
	)) {
		const monthKey = createMonthKey(month.year, month.month);
		const monthData = oldCacheState.dataByMonth.get(monthKey);
		const requiredVersion = monthVersions.get(monthKey) ?? 0;

		if (monthData === undefined || monthData.version < requiredVersion) {
			return month;
		}
	}
	return undefined;
}

function findRelevantReconciliations(
	reconciliations: BalanceReconciliation[],
	firstMonthToUpdate: MonthInstance,
): BalanceReconciliation[] | undefined {
	const firstDate = new Date(
		firstMonthToUpdate.year,
		firstMonthToUpdate.month,
		1,
	);
	let startIndex = reconciliations.findLastIndex(
		(reconciliation) => reconciliation.date <= firstDate,
	);

	if (startIndex === -1) {
		startIndex = reconciliations.findIndex(
			(reconciliation) => reconciliation.date >= firstDate,
		);
	}

	return startIndex === -1 ? undefined : reconciliations.slice(startIndex);
}

function resolveStartingBalance(
	startingBalanceIsFresh: boolean,
	previousMonthData: AccountBalanceMonthCacheData | undefined,
	anchorReconciliation: BalanceReconciliation | undefined,
	firstMonthToUpdate: MonthInstance,
	transactionOccurrencesByMonth: Map<string, TransactionOccurrencesMonthData>,
): {
	amount: number;
	month: MonthInstance;
	dayOfMonth: number;
} {
	if (startingBalanceIsFresh && previousMonthData?.endBalance !== undefined) {
		return {
			amount: previousMonthData.endBalance,
			month: firstMonthToUpdate,
			dayOfMonth: 1,
		};
	}

	if (anchorReconciliation === undefined) {
		throw new Error(
			'Cannot resolve a starting balance without an anchor reconciliation',
		);
	}

	const reconciliationMonth = {
		year: anchorReconciliation.date.getFullYear(),
		month: anchorReconciliation.date.getMonth(),
	};
	const reconciliationIsInOrAfterFirstMonth =
		reconciliationMonth.year > firstMonthToUpdate.year ||
		(reconciliationMonth.year === firstMonthToUpdate.year &&
			reconciliationMonth.month >= firstMonthToUpdate.month);

	if (reconciliationIsInOrAfterFirstMonth) {
		return {
			amount: anchorReconciliation.amount,
			month: reconciliationMonth,
			dayOfMonth: anchorReconciliation.date.getDate(),
		};
	}

	return {
		amount: calculateStartingBalanceForMonth(
			transactionOccurrencesByMonth,
			anchorReconciliation,
			firstMonthToUpdate,
		),
		month: firstMonthToUpdate,
		dayOfMonth: 1,
	};
}

export function updateMonthsBalances(
	updates: AccountBalanceMonthData[],
	monthVersions: Map<string, number>,
	state: BalanceCacheState,
): Partial<BalanceCacheStateUpdate> {
	const updatedDataByMonth = new Map(state.dataByMonth);

	for (const update of updates) {
		const { monthKey, startBalance, endBalance, dailyBalances } = update;
		const monthData = state.dataByMonth.get(monthKey);
		const requiredVersion = monthVersions.get(monthKey) ?? 0;

		if (monthData !== undefined && monthData.version >= requiredVersion) {
			// Don't update if the existing data is already fresh
			continue;
		}

		const updatedMonthData = {
			monthKey,
			startBalance,
			endBalance,
			dailyBalances,
			version: requiredVersion,
		};

		if (updatedMonthData !== undefined) {
			updatedDataByMonth.set(monthKey, updatedMonthData);
		}
	}

	return { dataByMonth: updatedDataByMonth };
}

const emptyMonthCaches = new Map();

function getCachedEmptyMonthData(
	monthKey: string,
	version: number = -1,
): AccountBalanceMonthCacheData {
	const cachedEmptyMonthData = emptyMonthCaches.get(monthKey);

	if (
		cachedEmptyMonthData !== undefined &&
		cachedEmptyMonthData.version >= version
	) {
		return cachedEmptyMonthData;
	}

	const emptyMonthData = {
		monthKey,
		startBalance: undefined,
		endBalance: undefined,
		dailyBalances: [],
		version,
	};

	emptyMonthCaches.set(monthKey, emptyMonthData);
	return emptyMonthData;
}

function getEmptyDataFillingMonthUpdates(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	versionsByMonth: Map<string, number>,
): AccountBalanceMonthCacheData[] {
	const updatedMonthDatas = [];

	for (const { year, month } of monthsInRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
	)) {
		const monthKey = createMonthKey(year, month);

		const emptyMonthData = getCachedEmptyMonthData(
			monthKey,
			versionsByMonth.get(monthKey) ?? -1,
		);
		updatedMonthDatas.push(emptyMonthData);
	}

	return updatedMonthDatas;
}
