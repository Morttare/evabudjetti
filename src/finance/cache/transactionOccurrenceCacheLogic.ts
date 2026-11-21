import type {
	MonthInstance,
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import { createMonthKey, dateToMonthKey, monthsInRange } from '../logic/util';

export interface TransactionOccurrenceCacheMonthData
	extends TransactionOccurrencesMonthData {
	version: number;
}

export interface TransactionOccurrenceMonthRange {
	first: MonthInstance;
	last: MonthInstance;
}

export function findTransactionOccurrenceMonthRange(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	monthVersions: Map<string, number>,
	cachedMonths: Map<string, TransactionOccurrenceCacheMonthData>,
): TransactionOccurrenceMonthRange | undefined {
	let first: MonthInstance | undefined;
	let last: MonthInstance | undefined;

	for (const month of monthsInRange(
		startYear,
		startMonth,
		endYear,
		endMonth,
	)) {
		const monthKey = createMonthKey(month.year, month.month);
		const monthData = cachedMonths.get(monthKey);
		const requiredVersion = monthVersions.get(monthKey) ?? 0;

		if (monthData === undefined || monthData.version < requiredVersion) {
			first ??= month;
			last = month;
		}
	}

	return first && last ? { first, last } : undefined;
}

/**
 * Groups occurrences by month and marks every month in the range as fresh,
 * including months that contain no transactions.
 */
export function groupTransactionOccurrencesByMonth(
	occurrences: TransactionOccurrence[],
	range: TransactionOccurrenceMonthRange,
	monthVersions: Map<string, number>,
): TransactionOccurrenceCacheMonthData[] {
	const occurrencesByMonth = new Map<string, TransactionOccurrence[]>();

	for (const month of monthsInRange(
		range.first.year,
		range.first.month,
		range.last.year,
		range.last.month,
	)) {
		occurrencesByMonth.set(createMonthKey(month.year, month.month), []);
	}

	for (const occurrence of occurrences) {
		const monthKey = dateToMonthKey(occurrence.date);
		const monthOccurrences = occurrencesByMonth.get(monthKey);

		if (monthOccurrences === undefined) {
			throw new Error(
				`Generated occurrence with date ${occurrence.date.toISOString()} has month key ${monthKey} outside the update range`,
			);
		}

		monthOccurrences.push(occurrence);
	}

	return Array.from(
		occurrencesByMonth,
		([monthKey, transactionOccurrences]) => ({
			monthKey,
			transactionOccurrences,
			version: monthVersions.get(monthKey) ?? 0,
		}),
	);
}
