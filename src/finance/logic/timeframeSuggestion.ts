import { startOfDay } from 'date-fns';
import type { PlannedTransaction, RecurrenceBase } from '@/src/dataModel';
import type { LengthOptions } from '@/src/store/useTimeframeStore';
import {
	addRecurrence,
	firstPlannedOccurrenceAfter,
} from './transactionOccurrencesLogic';

export interface TimeframeSuggestion {
	startDate: Date;
	length: number;
	type: LengthOptions;
	// The income the suggestion is based on, e.g. for showing its name in the UI
	basedOn: PlannedTransaction;
}

const RECURRENCE_TO_LENGTH: Record<RecurrenceBase, LengthOptions> = {
	day: 'days',
	week: 'weeks',
	month: 'months',
	year: 'years',
};

/**
 * Finds the largest recurring income, which is the recommended base for the timeframe.
 * @param transactions All planned transactions
 * @returns The recurring income with the largest amount, or undefined if there is none
 */
export function findLargestRecurringIncome(
	transactions: PlannedTransaction[],
): PlannedTransaction | undefined {
	return transactions
		.filter(
			(t) =>
				t.type === 'income' &&
				t.recurrenceBase !== null &&
				t.recurrenceInterval > 0,
		)
		.reduce<PlannedTransaction | undefined>(
			(largest, t) =>
				largest === undefined || t.amount > largest.amount
					? t
					: largest,
			undefined,
		);
}

/**
 * Suggests a timeframe based on the largest recurring income:
 * the timeframe starts on the payment day of that income and lasts one payment interval.
 * The start is the latest payment on or before the given date, so the suggested
 * timeframe contains that date. If the income has not been paid yet, the start is its first payment.
 * @param transactions All planned transactions
 * @param date The date for which the timeframe is suggested, usually today
 * @returns The suggested timeframe, or undefined if there is no active recurring income
 */
export function suggestTimeframe(
	transactions: PlannedTransaction[],
	date: Date = new Date(),
): TimeframeSuggestion | undefined {
	const income = findLargestRecurringIncome(transactions);
	if (income === undefined || income.recurrenceBase === null) {
		return undefined;
	}

	const nextPayment = firstPlannedOccurrenceAfter(income, date);
	if (nextPayment === undefined) {
		// The income has ended
		return undefined;
	}

	let startDate = nextPayment;
	if (startOfDay(nextPayment) > startOfDay(date)) {
		const previousPayment = addRecurrence(
			nextPayment,
			income.recurrenceBase,
			-income.recurrenceInterval,
		);
		if (startOfDay(previousPayment) >= startOfDay(income.startDate)) {
			startDate = previousPayment;
		}
	}

	return {
		startDate: startOfDay(startDate),
		length: income.recurrenceInterval,
		type: RECURRENCE_TO_LENGTH[income.recurrenceBase],
		basedOn: income,
	};
}
