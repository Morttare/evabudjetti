import { startOfMonth } from 'date-fns';
import type {
	MonthInstance,
	PlannedTransaction,
	TransactionOccurrence,
} from '@/src/dataModel';

export function dateToMonthKey(date: Date): string {
	return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function dateToDateKey(date: Date): string {
	return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export function monthKeyToDate(monthKey: string): Date {
	const [year, monthOneBased] = monthKey.split('-').map(Number);
	return new Date(year, monthOneBased - 1, 1);
}

export function createMonthKey(year: number, month: number): string {
	return `${year}-${(month + 1).toString().padStart(2, '0')}`;
}

export function createDateKey(
	year: number,
	month: number,
	day: number,
): string {
	return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function decodeMonthKey(monthKey: string): {
	year: number;
	month: number;
} {
	const [year, monthOneBased] = monthKey.split('-').map(Number);
	return { year, month: monthOneBased - 1 };
}

export function monthIsInRange(
	year: number,
	month: number,
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
): boolean {
	return (
		(year > startYear || (year === startYear && month >= startMonth)) &&
		(year < endYear || (year === endYear && month <= endMonth))
	);
}

export function monthsInRange(
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
): MonthInstance[] {
	let currentYear = startYear;
	let currentMonth = startMonth;
	const months: MonthInstance[] = [];

	while (
		currentYear < endYear ||
		(currentYear === endYear && currentMonth <= endMonth)
	) {
		months.push({ year: currentYear, month: currentMonth });

		currentMonth++;
		if (currentMonth > 11) {
			currentYear++;
			currentMonth = 0;
		}
	}

	return months;
}

export function getPreviousMonth(monthInstance: MonthInstance): MonthInstance {
	if (monthInstance.month === 0) {
		return { year: monthInstance.year - 1, month: 11 };
	}

	return { year: monthInstance.year, month: monthInstance.month - 1 };
}

export function plannedTransactionIsActiveInMonth(
	transaction: PlannedTransaction,
	monthKey: string,
): boolean {
	const month = monthKeyToDate(monthKey);

	if (transaction.recurrenceBase == null) {
		return (
			transaction.startDate.getFullYear() === month.getFullYear() &&
			transaction.startDate.getMonth() === month.getMonth()
		);
	}

	// Compare by month, so that a transaction starting mid-month is active in its start month
	const startMonth = startOfMonth(transaction.startDate);

	if (transaction.endDate == null) {
		return startMonth <= month;
	}

	return startMonth <= month && transaction.endDate >= month;
}

export function getSignedOccurrenceAmount(
	occurrence: TransactionOccurrence,
): number {
	return occurrence.type === 'income'
		? occurrence.amount
		: -occurrence.amount;
}

function safeParseDate(
	dateValue: Date | string | number | null | undefined,
): Date {
	if (dateValue == null) return new Date(NaN);
	if (dateValue instanceof Date) return dateValue;
	if (typeof dateValue === 'number') {
		if (dateValue < 10000000000) return new Date(dateValue * 1000);
		return new Date(dateValue);
	}
	if (typeof dateValue === 'string') {
		return new Date(dateValue.replace(' ', 'T'));
	}
	return new Date(NaN);
}

function getDaysDiff(d1: Date, d2: Date) {
	const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
	const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
	return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Counts occurrences in a month.
 * Frequent income recurrences are represented by a monthly average; other recurrences use actual dates.
 */
export function getTransactionOccurrenceCount(
	txn: PlannedTransaction,
	targetYear: number,
	targetMonth: number,
): number {
	if (!txn.startDate) return 0;

	const start = safeParseDate(txn.startDate);
	if (Number.isNaN(start.getTime())) return 0;

	if (isMonthBefore(targetYear, targetMonth, start)) {
		return 0;
	}

	if (txn.endDate) {
		const end = safeParseDate(txn.endDate);
		if (!Number.isNaN(end.getTime())) {
			if (isMonthAfter(targetYear, targetMonth, end)) {
				return 0;
			}
		}
	}

	if (txn.recurrenceBase == null) {
		return targetYear === start.getFullYear() &&
			targetMonth === start.getMonth()
			? 1
			: 0;
	}

	switch (txn.recurrenceBase) {
		case 'month':
			return countMonthlyOccurrences(txn, start, targetYear, targetMonth);
		case 'year':
			return countYearlyOccurrences(txn, start, targetYear, targetMonth);
		case 'week':
			return countWeeklyOccurrences(txn, start, targetYear, targetMonth);
		case 'day':
			return countDailyOccurrences(txn, start, targetYear, targetMonth);
		case null:
			return 0;
	}
}

function isMonthBefore(year: number, month: number, date: Date): boolean {
	return (
		year < date.getFullYear() ||
		(year === date.getFullYear() && month < date.getMonth())
	);
}

function isMonthAfter(year: number, month: number, date: Date): boolean {
	return (
		year > date.getFullYear() ||
		(year === date.getFullYear() && month > date.getMonth())
	);
}

function countMonthlyOccurrences(
	txn: PlannedTransaction,
	start: Date,
	targetYear: number,
	targetMonth: number,
): number {
	const monthDiff =
		(targetYear - start.getFullYear()) * 12 +
		targetMonth -
		start.getMonth();
	return monthDiff % getRecurrenceInterval(txn) === 0 ? 1 : 0;
}

function countYearlyOccurrences(
	txn: PlannedTransaction,
	start: Date,
	targetYear: number,
	targetMonth: number,
): number {
	const yearDiff = targetYear - start.getFullYear();
	return targetMonth === start.getMonth() &&
		yearDiff % getRecurrenceInterval(txn) === 0
		? 1
		: 0;
}

function countWeeklyOccurrences(
	txn: PlannedTransaction,
	start: Date,
	targetYear: number,
	targetMonth: number,
): number {
	const interval = getRecurrenceInterval(txn);
	if (txn.type === 'income' && interval < 4) {
		return 365 / (7 * interval) / 12;
	}

	return countDatesMatchingRecurrence(txn, start, targetYear, targetMonth, 7);
}

function countDailyOccurrences(
	txn: PlannedTransaction,
	start: Date,
	targetYear: number,
	targetMonth: number,
): number {
	const interval = getRecurrenceInterval(txn);
	if (txn.type === 'income' && interval <= 30) {
		return 365 / interval / 12;
	}

	return countDatesMatchingRecurrence(txn, start, targetYear, targetMonth, 1);
}

function countDatesMatchingRecurrence(
	txn: PlannedTransaction,
	start: Date,
	targetYear: number,
	targetMonth: number,
	daysPerUnit: number,
): number {
	let count = 0;
	const interval = getRecurrenceInterval(txn);
	const targetDate = new Date(targetYear, targetMonth, 1);
	while (targetDate.getMonth() === targetMonth) {
		const daysDiff = getDaysDiff(start, targetDate);
		if (daysDiff >= 0 && daysDiff % (daysPerUnit * interval) === 0) {
			count++;
		}
		targetDate.setDate(targetDate.getDate() + 1);
	}
	return count;
}

function getRecurrenceInterval(txn: PlannedTransaction): number {
	return txn.recurrenceInterval || 1;
}
