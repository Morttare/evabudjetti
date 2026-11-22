import type {
	Persisted,
	PlannedTransaction,
	PlannedTransactionOccurrenceException,
	RealTransaction,
	TransactionOccurrence,
} from '@/src/dataModel';
import {
	addRecurrence,
	firstPlannedOccurrenceAfter,
	nextPlannedOccurrence,
} from './recurrence';
import { dateToDateKey } from './util';

export { addRecurrence, firstPlannedOccurrenceAfter, nextPlannedOccurrence };

/**
 * Generates a list of all transaction occurrences (both planned and real) within the specified month range, sorted by date
 * @param startYear The year of the first month for which to generate occurrences
 * @param startMonth The first month (0-11) for which to generate occurrences
 * @param endYear The year of the last month for which to generate occurrences
 * @param endMonth The last month (0-11) for which to generate occurrences
 * @param relevantPlannedTransactions Transactions that have occurrences within the given month range
 * @param relevantRealTransactions Sorted-by-date transactions that occur within the given month range
 * @param excludedPlannedOccurrences Planned occurrences suppressed by deletion or moved to a real transaction
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
	const overriddenOccurrenceDates = indexOverriddenOccurrenceDates(
		excludedPlannedOccurrences,
		relevantRealTransactions,
	);

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

function indexOverriddenOccurrenceDates(
	exceptions: PlannedTransactionOccurrenceException[],
	realTransactions: Persisted<RealTransaction>[],
): Map<number, Set<string>> {
	const overriddenDates = new Map<number, Set<string>>();

	for (const exception of exceptions) {
		addOverriddenDate(
			overriddenDates,
			exception.plannedTransactionId,
			exception.occurrenceDate,
		);
	}

	for (const transaction of realTransactions) {
		if (transaction.plannedTransactionId == null) {
			continue;
		}
		addOverriddenDate(
			overriddenDates,
			transaction.plannedTransactionId,
			transaction.plannedOccurrenceDate ?? transaction.date,
		);
		addOverriddenDate(
			overriddenDates,
			transaction.plannedTransactionId,
			transaction.date,
		);
	}

	return overriddenDates;
}

function addOverriddenDate(
	overriddenDates: Map<number, Set<string>>,
	plannedTransactionId: number,
	date: Date,
): void {
	const dates =
		overriddenDates.get(plannedTransactionId) ?? new Set<string>();
	dates.add(dateToDateKey(date));
	overriddenDates.set(plannedTransactionId, dates);
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
	const date = new Date(startYear, startMonth, 1);
	const afterEndMonth = new Date(endYear, endMonth + 1, 1);
	const occurrences: TransactionOccurrence[] = [];

	type PendingEntry = {
		planned: Persisted<PlannedTransaction>;
		nextDate: Date;
		// Preserves the previous input-order tie-break for matching dates.
		order: number;
	};
	const pending: PendingEntry[] = [];

	for (let order = 0; order < relevantPlannedTransactions.length; order++) {
		const planned = relevantPlannedTransactions[order];
		const nextDate = firstPlannedOccurrenceAfter(planned, date);
		if (nextDate !== undefined) {
			pushPendingOccurrence(pending, { planned, nextDate, order });
		}
	}

	while (pending.length > 0) {
		const nearest = popPendingOccurrence(pending);
		if (nearest === undefined || nearest.nextDate >= afterEndMonth) {
			break;
		}

		const { planned, nextDate } = nearest;
		const overriddenDatesForPlanned = overriddenOccurrenceDates.get(
			planned.id,
		);

		const nearestOccurrenceDateKey = dateToDateKey(nextDate);

		if (!overriddenDatesForPlanned?.has(nearestOccurrenceDateKey)) {
			occurrences.push(plannedTransactionToOccurrence(planned, nextDate));
		}

		const nextOccurrence = nextPlannedOccurrence(planned, nextDate);

		if (nextOccurrence !== undefined) {
			pushPendingOccurrence(pending, {
				planned,
				nextDate: nextOccurrence,
				order: nearest.order,
			});
		}
	}

	return occurrences;
}

function pushPendingOccurrence<T extends { nextDate: Date; order: number }>(
	heap: T[],
	entry: T,
): void {
	let index = heap.length;
	heap.push(entry);

	while (index > 0) {
		const parentIndex = Math.floor((index - 1) / 2);
		const parent = heap[parentIndex];
		if (parent === undefined || !comesBefore(entry, parent)) {
			break;
		}
		heap[index] = parent;
		index = parentIndex;
	}

	heap[index] = entry;
}

function popPendingOccurrence<T extends { nextDate: Date; order: number }>(
	heap: T[],
): T | undefined {
	const first = heap[0];
	if (first === undefined) {
		return undefined;
	}

	const last = heap.pop();
	if (last === undefined) {
		throw new Error('Pending occurrence heap became empty unexpectedly');
	}

	if (heap.length === 0) {
		return first;
	}

	let index = 0;
	while (true) {
		const leftIndex = index * 2 + 1;
		if (leftIndex >= heap.length) {
			break;
		}
		const rightIndex = leftIndex + 1;
		const left = heap[leftIndex];
		const right = heap[rightIndex];
		const childIndex =
			right !== undefined &&
			left !== undefined &&
			comesBefore(right, left)
				? rightIndex
				: leftIndex;
		const child = heap[childIndex];
		if (child === undefined || !comesBefore(child, last)) {
			break;
		}
		heap[index] = child;
		index = childIndex;
	}

	heap[index] = last;
	return first;
}

function comesBefore(
	left: { nextDate: Date; order: number },
	right: { nextDate: Date; order: number },
): boolean {
	return (
		left.nextDate.getTime() < right.nextDate.getTime() ||
		(left.nextDate.getTime() === right.nextDate.getTime() &&
			left.order < right.order)
	);
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
