import { create } from 'zustand';
import type {
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import { generateTransactionOccurrences } from '../logic/transactionOccurrencesLogic';
import { createMonthKey } from '../logic/util';
import { fetchPlannedTransactionOccurrenceExceptionsByDateRange } from '../query/plannedTransactionOccurrenceExceptionQueries';
import { fetchPlannedTransactionsInRange as fetchPlannedTransactionsActiveInRange } from '../query/plannedTransactionQueries';
import { fetchRealTransactionsByDateRange } from '../query/realTransactionQueries';
import {
	findTransactionOccurrenceMonthRange,
	groupTransactionOccurrencesByMonth,
} from './transactionOccurrenceCacheLogic';

export interface TransactionOccurrencesMonthCacheData {
	/**
	 * A stable key representing the month, e.g. "2026-04", also used as the key in the cache map
	 */
	monthKey: string;
	/**
	 * All transaction occurrences that happen in this month, including both planned and real transactions
	 */
	transactionOccurrences: TransactionOccurrence[];
	/**
	 * Version of the month at the time of the cache update.
	 * Used to determine if the cache data is still fresh enough to be used or if it needs to be updated.
	 */
	version: number;
}

export interface TransactionOccurrencesCacheState {
	dataByMonth: Map<string, TransactionOccurrencesMonthCacheData>;

	updateTransactionOccurrencesCacheForMonths: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
		monthVersions: Map<string, number>,
	) => Promise<TransactionOccurrencesCacheState>;
	getMonth: (monthKey: string) => TransactionOccurrencesMonthCacheData;
}

export interface TransactionOccurrencesCacheStateUpdate {
	dataByMonth: Map<string, TransactionOccurrencesMonthCacheData>;
}

export const useTransactionOccurrencesCache =
	create<TransactionOccurrencesCacheState>((set, get) => ({
		dataByMonth: new Map(),

		updateTransactionOccurrencesCacheForMonths: async (
			startYear: number,
			startMonth: number,
			endYear: number,
			endMonth: number,
			monthVersions: Map<string, number>,
		): Promise<TransactionOccurrencesCacheState> => {
			const state = get();
			const monthUpdates =
				await updateTransactionOccurrencesCacheForMonths(
					startYear,
					startMonth,
					endYear,
					endMonth,
					monthVersions,
					state,
				);

			if (monthUpdates.length === 0) {
				// No months were updated, do not change the state
				return state;
			}

			set((state) =>
				updateMonthsTransactionOccurrences(
					monthUpdates,
					monthVersions,
					state,
				),
			);

			return get();
		},

		getMonth: (monthKey: string) => {
			const monthData = get().dataByMonth.get(monthKey);

			if (monthData === undefined) {
				// To prevent re-rendering due to recreated empty month data, we cache it
				return getCachedEmptyMonthData(monthKey);
			}

			return monthData;
		},
	}));

/**
 * Finds stale months and recalculates a contiguous cache range that includes
 * the first and last stale month. The result is empty when all months are fresh.
 */
async function updateTransactionOccurrencesCacheForMonths(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	monthVersions: Map<string, number>,
	oldCacheState: TransactionOccurrencesCacheState,
): Promise<TransactionOccurrencesMonthCacheData[]> {
	const start = performance.now();
	const updateRange = findTransactionOccurrenceMonthRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
		monthVersions,
		oldCacheState.dataByMonth,
	);

	if (updateRange === undefined) {
		return [];
	}

	console.debug(
		`[TransactionOccurrencesCache] Updating transaction occurrences cache for months ${createMonthKey(
			updateRange.first.year,
			updateRange.first.month,
		)} to ${createMonthKey(updateRange.last.year, updateRange.last.month)}`,
	);

	const relevantPlannedTransactions =
		await fetchPlannedTransactionsActiveInRange(
			updateRange.first,
			updateRange.last,
		);

	const relevantRealTransactions = await fetchRealTransactionsByDateRange(
		updateRange.first,
		updateRange.last,
	);
	// Exceptions are queried by scheduled date, which may differ from a moved transaction's current date.
	const excludedPlannedOccurrences =
		await fetchPlannedTransactionOccurrenceExceptionsByDateRange(
			updateRange.first,
			updateRange.last,
		);

	const generatedOccurrences = generateTransactionOccurrences(
		updateRange.first.year,
		updateRange.first.month,
		updateRange.last.year,
		updateRange.last.month,
		relevantPlannedTransactions,
		relevantRealTransactions,
		excludedPlannedOccurrences,
	);
	const updates = groupTransactionOccurrencesByMonth(
		generatedOccurrences,
		updateRange,
		monthVersions,
	);

	console.debug(
		`[TransactionOccurrencesCache] Calculated transaction occurrences cache updates for months ${createMonthKey(
			updateRange.first.year,
			updateRange.first.month,
		)} to ${createMonthKey(
			updateRange.last.year,
			updateRange.last.month,
		)} in ${performance.now() - start} ms`,
	);

	return updates;
}

function updateMonthsTransactionOccurrences(
	updates: TransactionOccurrencesMonthData[],
	monthVersions: Map<string, number>,
	state: TransactionOccurrencesCacheState,
): Partial<TransactionOccurrencesCacheStateUpdate> {
	const updatedMonthDatas = [];
	for (const { monthKey, transactionOccurrences } of updates) {
		const monthData = state.dataByMonth.get(monthKey);
		const occurrencesVersion = monthVersions.get(monthKey) ?? 0;
		const updatedMonthData = updateMonthTransactionOccurrences(
			monthKey,
			monthData,
			transactionOccurrences,
			occurrencesVersion,
		);
		if (updatedMonthData !== undefined) {
			updatedMonthDatas.push(updatedMonthData);
		}
	}

	if (updatedMonthDatas.length === 0) {
		// No months were updated, do not change the state
		return {};
	}

	const newDataByMonth = new Map(state.dataByMonth);

	for (const monthData of updatedMonthDatas) {
		newDataByMonth.set(monthData.monthKey, monthData);
	}

	return { dataByMonth: newDataByMonth };
}

function updateMonthTransactionOccurrences(
	monthKey: string,
	monthData: TransactionOccurrencesMonthCacheData | undefined,
	occurrences: TransactionOccurrence[],
	occurrencesVersion: number,
): TransactionOccurrencesMonthCacheData | undefined {
	if (monthData !== undefined && monthData.version >= occurrencesVersion) {
		// The existing data is already fresh, so we skip the update to avoid overwriting fresher data with stale data
		return undefined;
	}

	return {
		monthKey,
		transactionOccurrences: occurrences,
		version: occurrencesVersion,
	};
}

const emptyMonthCaches = new Map();

function getCachedEmptyMonthData(
	monthKey: string,
): TransactionOccurrencesMonthCacheData {
	const cachedEmptyMonthData = emptyMonthCaches.get(monthKey);

	if (cachedEmptyMonthData !== undefined) {
		return cachedEmptyMonthData;
	}

	const emptyMonthData = {
		monthKey,
		transactionOccurrences: [],
		version: -1,
	};

	emptyMonthCaches.set(monthKey, emptyMonthData);
	return emptyMonthData;
}
