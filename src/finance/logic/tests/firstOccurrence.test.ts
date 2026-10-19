import type {
	BalanceReconciliation,
	Persisted,
	PlannedTransaction,
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import { calculateBalanceDatasForMonths } from '../balanceLogic';
import { generateTransactionOccurrences } from '../transactionOccurrencesLogic';
import { createMonthKey, plannedTransactionIsActiveInMonth } from '../util';

// Customer example: daily allowance of 580 € starting 6 Nov 2026, recurring every 4 weeks
const dailyAllowance = {
	id: 1,
	accountId: 1,
	categoryId: 0,
	name: 'Daily allowance',
	amount: 580,
	type: 'income',
	recurrenceBase: 'week',
	recurrenceInterval: 4,
	startDate: new Date(2026, 10, 6, 14, 5),
	endDate: null,
} as Persisted<PlannedTransaction>;

const NOV = { year: 2026, month: 10 };
const DEC = { year: 2026, month: 11 };

function occurrencesByMonth(occurrences: TransactionOccurrence[]) {
	const map = new Map<string, TransactionOccurrencesMonthData>();
	for (const { year, month } of [NOV, DEC]) {
		map.set(createMonthKey(year, month), {
			transactionOccurrences: occurrences.filter(
				(o) => o.date.getMonth() === month,
			),
		} as TransactionOccurrencesMonthData);
	}
	return map;
}

function reconciliation(amount: number, date: Date): BalanceReconciliation {
	return { id: 1, accountId: 1, amount, date } as BalanceReconciliation;
}

describe('first occurrence of a recurring transaction', () => {
	it('is active in its start month for cache versioning', () => {
		expect(
			plannedTransactionIsActiveInMonth(dailyAllowance, '2026-11'),
		).toBe(true);
		expect(
			plannedTransactionIsActiveInMonth(dailyAllowance, '2026-10'),
		).toBe(false);
	});

	it('is generated on the start date', () => {
		const occurrences = generateTransactionOccurrences(
			2026,
			10,
			2026,
			11,
			[dailyAllowance],
			[],
		);
		expect(occurrences.map((o) => o.date.getDate())).toEqual([6, 4]);
	});

	it('is included when the balance was reconciled earlier on the same day', () => {
		const occurrences = generateTransactionOccurrences(
			2026,
			10,
			2026,
			11,
			[dailyAllowance],
			[],
		);
		const result = calculateBalanceDatasForMonths(
			occurrencesByMonth(occurrences),
			[reconciliation(0, new Date(2026, 10, 6, 14, 0))],
			0,
			6,
			NOV,
			DEC,
		);
		expect(result[0].dailyBalances[5]?.balance).toBe(580); // 6 Nov
		expect(result[1].dailyBalances[3]?.balance).toBe(1160); // 4 Dec
	});

	it('is not counted twice when the balance was reconciled after it', () => {
		const occurrences = generateTransactionOccurrences(
			2026,
			10,
			2026,
			11,
			[dailyAllowance],
			[],
		);
		const result = calculateBalanceDatasForMonths(
			occurrencesByMonth(occurrences),
			[reconciliation(580, new Date(2026, 10, 6, 15, 0))],
			580,
			6,
			NOV,
			DEC,
		);
		expect(result[0].dailyBalances[5]?.balance).toBe(580);
	});
});
