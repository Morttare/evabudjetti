import type { Duration } from 'date-fns';
import {
	differenceInDays,
	intervalToDuration,
	startOfDay,
	yearsToMonths,
} from 'date-fns';
import { add } from 'date-fns/add';
import type { PlannedTransaction, RecurrenceBase } from '@/src/dataModel';

/** Adds one recurrence interval to a date. */
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

export function assertValidRecurrence(planned: PlannedTransaction): void {
	if (planned.recurrenceBase !== null && planned.recurrenceInterval <= 0) {
		throw new Error(
			`Invalid recurrence interval: ${planned.recurrenceInterval} for planned transaction`,
		);
	}
}

/**
 * Finds the first occurrence of a planned transaction at or after a date,
 * accounting for its recurrence interval and end date.
 */
export function firstPlannedOccurrenceAfter(
	planned: PlannedTransaction,
	afterDate: Date,
): Date | undefined {
	const plannedStartDate = startOfDay(planned.startDate);
	const plannedEndDate = planned.endDate ? startOfDay(planned.endDate) : null;
	const searchDate = startOfDay(afterDate);

	if (plannedStartDate >= searchDate) {
		return planned.startDate;
	}

	assertValidRecurrence(planned);

	let occurrence: Date | undefined;
	switch (planned.recurrenceBase) {
		case null:
			occurrence = undefined;
			break;
		case 'day':
			occurrence = add(planned.startDate, {
				days:
					Math.ceil(
						differenceInDays(searchDate, plannedStartDate) /
							planned.recurrenceInterval,
					) * planned.recurrenceInterval,
			});
			break;
		case 'week':
			occurrence = add(planned.startDate, {
				weeks:
					Math.ceil(
						differenceInDays(searchDate, plannedStartDate) /
							(7 * planned.recurrenceInterval),
					) * planned.recurrenceInterval,
			});
			break;
		case 'month':
		case 'year': {
			const duration = intervalToDuration({
				start: plannedStartDate,
				end: searchDate,
			});
			occurrence = recurrenceOccurrenceAfterDuration(
				planned,
				duration,
				planned.recurrenceBase,
			);
			break;
		}
		default:
			throw new Error(
				`Invalid recurrence base: ${planned.recurrenceBase}`,
			);
	}

	if (
		occurrence !== undefined &&
		plannedEndDate !== null &&
		occurrence > plannedEndDate
	) {
		return undefined;
	}

	return occurrence;
}

/** Returns the next occurrence after a date, or undefined for one-time or ended transactions. */
export function nextPlannedOccurrence(
	planned: PlannedTransaction,
	currentOccurrence: Date,
): Date | undefined {
	if (planned.recurrenceBase === null || planned.recurrenceInterval <= 0) {
		return undefined;
	}

	const occurrence = addRecurrence(
		currentOccurrence,
		planned.recurrenceBase,
		planned.recurrenceInterval,
	);

	return planned.endDate && occurrence > planned.endDate
		? undefined
		: occurrence;
}

function recurrenceOccurrenceAfterDuration(
	planned: PlannedTransaction,
	duration: Duration,
	base: 'month' | 'year',
): Date {
	const years = duration.years ?? 0;
	const months = duration.months ?? 0;
	const hasSubUnitRemainder =
		base === 'month'
			? (duration.days ?? 0) > 0
			: months > 0 || (duration.days ?? 0) > 0;

	if (base === 'month') {
		const elapsed =
			yearsToMonths(years) + months + (hasSubUnitRemainder ? 1 : 0);
		return add(planned.startDate, {
			months:
				Math.ceil(elapsed / planned.recurrenceInterval) *
				planned.recurrenceInterval,
		});
	}

	const elapsed = years + (hasSubUnitRemainder ? 1 : 0);
	return add(planned.startDate, {
		years:
			Math.ceil(elapsed / planned.recurrenceInterval) *
			planned.recurrenceInterval,
	});
}
