import {
	differenceInDays,
	intervalToDuration,
	startOfDay,
	yearsToMonths,
} from 'date-fns';
import { add } from 'date-fns/add';
import type {
	Persisted,
	PlannedTransaction,
	PlannedTransactionOccurrenceException,
	RealTransaction,
	RecurrenceBase,
	TransactionOccurrence,
} from '@/src/dataModel';
import { dateToDateKey } from './util';

/**
 * Generates a list of all transaction occurrences (both planned and real) within the specified month range, sorted by date
 * @param startYear The year of the first month for which to generate occurrences
 * @param startMonth The first month (0-11) for which to generate occurrences
 * @param endYear The year of the last month for which to generate occurrences
 * @param endMonth The last month (0-11) for which to generate occurrences
 * @param relevantPlannedTransactions Transactions that have occurrences within the given month range
 * @param relevantRealTransactions Sorted-by-date transactions that occur within the given month range
 * @returns A list of all transaction occurrences (both planned and real) within the specified month range, sorted by date
 */
export function generateTransactionOccurrences(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	relevantPlannedTransactions: Persisted<PlannedTransaction>[],
	relevantRealTransactions: Persisted<RealTransaction>[],
	excludedPlannedOccurrences: PlannedTransactionOccurrenceException[] = [],
): TransactionOccurrence[] {
	const overriddenOccurrenceDates: Map<number, Set<string>> = new Map();
	// Exceptions suppress deleted dates; linked real transactions also suppress their source and current dates.
	for (const exception of excludedPlannedOccurrences) {
		const dateSet =
			overriddenOccurrenceDates.get(exception.plannedTransactionId) ??
			new Set();
		dateSet.add(dateToDateKey(exception.occurrenceDate));
		overriddenOccurrenceDates.set(exception.plannedTransactionId, dateSet);
	}

	for (const real of relevantRealTransactions) {
		if (real.plannedTransactionId) {
			const dateSet =
				overriddenOccurrenceDates.get(real.plannedTransactionId) ??
				new Set();
			dateSet.add(dateToDateKey(real.plannedOccurrenceDate ?? real.date));
			dateSet.add(dateToDateKey(real.date));
			overriddenOccurrenceDates.set(real.plannedTransactionId, dateSet);
		}
	}

	const plannedOccurrences = generatePlannedTransactionOccurrencesForMonths(
		startYear,
		startMonth,
		endYear,
		endMonth,
		relevantPlannedTransactions,
		overriddenOccurrenceDates,
	);

	const occurrences = [];

	let nextPlannedIndex = 0;
	let nextRealIndex = 0;

	while (
		nextPlannedIndex < plannedOccurrences.length ||
		nextRealIndex < relevantRealTransactions.length
	) {
		if (nextPlannedIndex >= plannedOccurrences.length) {
			occurrences.push(
				...relevantRealTransactions
					.slice(nextRealIndex)
					.map(realTransactionToOccurrence),
			);
			break;
		}
		if (nextRealIndex >= relevantRealTransactions.length) {
			occurrences.push(...plannedOccurrences.slice(nextPlannedIndex));
			break;
		}

		const nextPlanned = plannedOccurrences[nextPlannedIndex];
		const nextReal = relevantRealTransactions[nextRealIndex];

		if (nextPlanned.date <= nextReal.date) {
			occurrences.push(nextPlanned);
			nextPlannedIndex++;
		} else {
			occurrences.push(realTransactionToOccurrence(nextReal));
			nextRealIndex++;
		}
	}

	return occurrences;
}

/**
 * Generates all occurrences for the given month range based on the relevant planned transactions and overridden occurrence dates
 * @param startYear The year of the first month for which to generate occurrences
 * @param startMonth The first month (0-11) for which to generate occurrences
 * @param endYear The year of the last month for which to generate occurrences
 * @param endMonth The last month (0-11) for which to generate occurrences
 * @param relevantPlannedTransactions Transactions that have occurrences within the given range
 * @param overriddenOccurrenceDates A map of overridden occurrence dates keyed by planned transaction ID
 * @returns A list of planned transaction occurrences for the given month range
 */
function generatePlannedTransactionOccurrencesForMonths(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
	relevantPlannedTransactions: Persisted<PlannedTransaction>[],
	overriddenOccurrenceDates: Map<number, Set<string>>,
): TransactionOccurrence[] {
	let date = new Date(startYear, startMonth, 1);
	const afterEndMonth = new Date(endYear, endMonth + 1, 1);
	const occurrences: TransactionOccurrence[] = [];

	type PendingEntry = {
		planned: Persisted<PlannedTransaction>;
		nextDate: Date;
	};
	const pending: PendingEntry[] = relevantPlannedTransactions
		.map((t) => {
			const nextDate = firstPlannedOccurrenceAfter(t, date);
			return nextDate !== undefined
				? { planned: t, nextDate }
				: undefined;
		})
		.filter((entry) => entry !== undefined);

	while (date < afterEndMonth) {
		let nearestIndex = -1;
		let nearestDate: Date | undefined;

		for (let i = 0; i < pending.length; i++) {
			const { nextDate } = pending[i];

			if (nearestDate === undefined || nextDate < nearestDate) {
				nearestDate = nextDate;
				nearestIndex = i;
			}
		}

		if (nearestDate === undefined || nearestDate >= afterEndMonth) {
			break;
		}

		const { planned } = pending[nearestIndex];
		const overriddenDatesForPlanned = overriddenOccurrenceDates.get(
			planned.id,
		);

		const nearestOccurrenceDateKey = dateToDateKey(nearestDate);

		if (!overriddenDatesForPlanned?.has(nearestOccurrenceDateKey)) {
			occurrences.push(
				plannedTransactionToOccurrence(planned, nearestDate),
			);
		}

		const nextOccurrence = nextPlannedOccurrence(planned, nearestDate);

		if (nextOccurrence === undefined) {
			pending.splice(nearestIndex, 1);
		} else {
			pending[nearestIndex].nextDate = nextOccurrence;
		}

		date = nearestDate;
	}

	return occurrences;
}

/**
 * Finds the first planned occurrence of a transaction after a given date
 * @param planned The planned transaction for which to find an occurrence
 * @param afterDate The date after which to search for occurrences
 * @returns The date of the first occurrence after the specified date, or undefined if none exists
 */
export function firstPlannedOccurrenceAfter(
	planned: PlannedTransaction,
	afterDate: Date,
): Date | undefined {
	const plannedStartDate = startOfDay(planned.startDate);
	const plannedEndDate = planned.endDate ? startOfDay(planned.endDate) : null;
	afterDate = startOfDay(afterDate);

	if (plannedStartDate >= afterDate) {
		return planned.startDate;
	}

	var firstOccurrenceAfter: Date | undefined;

	if (planned.recurrenceBase !== null && planned.recurrenceInterval <= 0) {
		throw new Error(
			`Invalid recurrence interval: ${planned.recurrenceInterval} for planned transaction`,
		);
	}

	switch (planned.recurrenceBase) {
		case null:
			firstOccurrenceAfter =
				plannedStartDate >= afterDate ? plannedStartDate : undefined;
			break;
		case 'day': {
			const daysDiff = differenceInDays(afterDate, plannedStartDate);
			const intervalsToAdd = Math.ceil(
				daysDiff / planned.recurrenceInterval,
			);
			firstOccurrenceAfter = add(planned.startDate, {
				days: intervalsToAdd * planned.recurrenceInterval,
			});
			break;
		}
		case 'week': {
			const daysDiff = differenceInDays(afterDate, plannedStartDate);
			const intervalsToAdd = Math.ceil(
				daysDiff / (7 * planned.recurrenceInterval),
			);
			firstOccurrenceAfter = add(planned.startDate, {
				weeks: intervalsToAdd * planned.recurrenceInterval,
			});
			break;
		}
		case 'month': {
			const diff = intervalToDuration({
				start: plannedStartDate,
				end: afterDate,
			});
			const hasSubMonthRemainder = (diff.days ?? 0) > 0;
			const monthsDiff =
				yearsToMonths(diff.years ?? 0) +
				(diff.months ?? 0) +
				(hasSubMonthRemainder ? 1 : 0);
			const intervalsToAdd = Math.ceil(
				monthsDiff / planned.recurrenceInterval,
			);
			firstOccurrenceAfter = add(planned.startDate, {
				months: intervalsToAdd * planned.recurrenceInterval,
			});
			break;
		}
		case 'year': {
			const diff = intervalToDuration({
				start: plannedStartDate,
				end: afterDate,
			});
			const hasSubYearRemainder =
				(diff.months ?? 0) > 0 || (diff.days ?? 0) > 0;
			const yearsDiff = (diff.years ?? 0) + (hasSubYearRemainder ? 1 : 0);
			const intervalsToAdd = Math.ceil(
				yearsDiff / planned.recurrenceInterval,
			);
			firstOccurrenceAfter = add(planned.startDate, {
				years: intervalsToAdd * planned.recurrenceInterval,
			});
			break;
		}
		default:
			throw new Error(
				`Invalid recurrence base: ${planned.recurrenceBase}`,
			);
	}

	if (
		firstOccurrenceAfter != null &&
		plannedEndDate != null &&
		firstOccurrenceAfter > plannedEndDate
	) {
		return undefined;
	}

	return firstOccurrenceAfter;
}

/**
 * Finds the next occurrence of a planned transaction after a given occurrence date
 * @param planned The planned transaction for which to find the next occurrence
 * @param currentOccurrence The date of the current occurrence
 * @returns The date of the next occurrence after the specified date, or undefined if none exists
 */
export function nextPlannedOccurrence(
	planned: PlannedTransaction,
	currentOccurrence: Date,
): Date | undefined {
	if (planned.recurrenceBase == null || planned.recurrenceInterval <= 0) {
		return undefined;
	}

	const nextOccurrence = addRecurrence(
		currentOccurrence,
		planned.recurrenceBase,
		planned.recurrenceInterval,
	);

	if (planned.endDate && nextOccurrence > planned.endDate) {
		return undefined;
	}

	return nextOccurrence;
}

/**
 * Adds the specified recurrence interval to a date based on the given recurrence base
 * @param date The date to which to add the recurrence interval
 * @param recurrenceBase The base unit of the recurrence (day, week, month, or year)
 * @param recurrenceInterval The number of recurrence units to add
 * @returns The new date after adding the specified recurrence interval
 */
export function addRecurrence(
	date: Date,
	recurrenceBase: RecurrenceBase,
	recurrenceInterval: number,
): Date {
	switch (recurrenceBase) {
		case 'day':
			return add(date, { days: recurrenceInterval });
		case 'week':
			return add(date, { weeks: recurrenceInterval });
		case 'month':
			return add(date, { months: recurrenceInterval });
		case 'year':
			return add(date, { years: recurrenceInterval });
		default:
			throw new Error(`Invalid recurrence base: ${recurrenceBase}`);
	}
}

export function realTransactionToOccurrence(
	real: Persisted<RealTransaction>,
): TransactionOccurrence {
	return {
		amount: real.amount,
		categoryId: real.categoryId,
		type: real.type,
		name: real.name,
		date: real.date,
		realTransaction: real,
	};
}

export function plannedTransactionToOccurrence(
	planned: Persisted<PlannedTransaction>,
	occurrenceDate: Date,
): TransactionOccurrence {
	return {
		amount: planned.amount,
		categoryId: planned.categoryId,
		type: planned.type,
		name: planned.name,
		date: occurrenceDate,
		plannedTransaction: planned,
	};
}
