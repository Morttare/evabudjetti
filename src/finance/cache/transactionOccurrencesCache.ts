import { create } from 'zustand';
import type {
	MonthInstance,
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import { generateTransactionOccurrences } from '../logic/transactionOccurrencesLogic';
import { createMonthKey, dateToMonthKey, monthsInRange } from '../logic/util';
import { fetchPlannedTransactionOccurrenceExceptionsByDateRange } from '../query/plannedTransactionOccurrenceExceptionQueries';
import { fetchPlannedTransactionsInRange as fetchPlannedTransactionsActiveInRange } from '../query/plannedTransactionQueries';
import { fetchRealTransactionsByDateRange } from '../query/realTransactionQueries';

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

async function updateTransactionOccurrencesCacheForMonths(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	monthVersions: Map<string, number>,
	oldCacheState: TransactionOccurrencesCacheState,
): Promise<TransactionOccurrencesMonthCacheData[]> {
	let firstMonthToUpdate: MonthInstance | undefined;
	let lastMonthToUpdate: MonthInstance | undefined;

	const start = performance.now();

	console.debug(
		`[TransactionOccurrencesCache] updateTransactionOccurrencesCacheForMonths called for ${createMonthKey(startYear, startMonth)} to ${createMonthKey(endYear, endMonth)}`,
		{
			monthVersionsSize: monthVersions.size,
			monthVersionsArray: Array.from(monthVersions.entries()),
			cacheSize: oldCacheState.dataByMonth.size,
		},
	);

	for (const { year, month } of monthsInRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
	)) {
		const monthKey = createMonthKey(year, month);
		const monthData = oldCacheState.dataByMonth.get(monthKey);
		const requiredVersion = monthVersions.get(monthKey) ?? 0;

		console.debug(
			`[TransactionOccurrencesCache] Checking month ${monthKey}: cacheVersion=${monthData?.version}, requiredVersion=${requiredVersion}, needsUpdate=${monthData === undefined || monthData.version < requiredVersion}`,
		);

		if (monthData === undefined || monthData.version < requiredVersion) {
			if (firstMonthToUpdate === undefined) {
				firstMonthToUpdate = { year, month };
			}

			lastMonthToUpdate = { year, month };
		}
	}

	if (firstMonthToUpdate === undefined || lastMonthToUpdate === undefined) {
		// No months need updating, return an empty update to avoid unnecessary state updates
		console.debug(
			`[TransactionOccurrencesCache] No months need updating (firstMonthToUpdate=${firstMonthToUpdate}, lastMonthToUpdate=${lastMonthToUpdate})`,
		);
		return [];
	}

	console.debug(
		`[TransactionOccurrencesCache] Updating transaction occurrences cache for months ${createMonthKey(
			firstMonthToUpdate.year,
			firstMonthToUpdate.month,
		)} to ${createMonthKey(lastMonthToUpdate.year, lastMonthToUpdate.month)}`,
	);

	const relevantPlannedTransactions =
		await fetchPlannedTransactionsActiveInRange(
			firstMonthToUpdate,
			lastMonthToUpdate,
		);

	const relevantRealTransactions = await fetchRealTransactionsByDateRange(
		firstMonthToUpdate,
		lastMonthToUpdate,
	);
	// Exceptions are queried by scheduled date, which may differ from a moved transaction's current date.
	const excludedPlannedOccurrences =
		await fetchPlannedTransactionOccurrenceExceptionsByDateRange(
			firstMonthToUpdate,
			lastMonthToUpdate,
		);

	const generatedOccurrences = generateTransactionOccurrences(
		firstMonthToUpdate.year,
		firstMonthToUpdate.month,
		lastMonthToUpdate.year,
		lastMonthToUpdate.month,
		relevantPlannedTransactions,
		relevantRealTransactions,
		excludedPlannedOccurrences,
	);

	const generatedOccurrencesByMonthKey: Map<string, TransactionOccurrence[]> =
		new Map();

	// Pre-populate all months in the update range with empty arrays so that
	// months with no transactions are still marked fresh after this update.
	for (const { year, month } of monthsInRange(
		firstMonthToUpdate.year,
		firstMonthToUpdate.month,
		lastMonthToUpdate.year,
		lastMonthToUpdate.month,
	)) {
		generatedOccurrencesByMonthKey.set(createMonthKey(year, month), []);
	}

	for (const occurrence of generatedOccurrences) {
		const occurrenceMonthKey = dateToMonthKey(occurrence.date);
		const monthOccurrences =
			generatedOccurrencesByMonthKey.get(occurrenceMonthKey);

		if (monthOccurrences === undefined) {
			throw new Error(
				`Generated occurrence with date ${occurrence.date.toISOString()} has month key ${occurrenceMonthKey} which is outside of the expected range`,
			);
		}

		monthOccurrences.push(occurrence);
	}

	const updates = [];

	for (const [
		monthKey,
		transactionOccurrences,
	] of generatedOccurrencesByMonthKey.entries()) {
		const version = monthVersions.get(monthKey) ?? 0;
		updates.push({
			monthKey,
			transactionOccurrences,
			version,
		});
	}

	console.debug(
		`[TransactionOccurrencesCache] Calculated transaction occurrences cache updates for months ${createMonthKey(
			firstMonthToUpdate.year,
			firstMonthToUpdate.month,
		)} to ${createMonthKey(lastMonthToUpdate.year, lastMonthToUpdate.month)} in ${performance.now() - start} ms`,
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
