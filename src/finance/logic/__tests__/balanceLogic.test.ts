import type {
	BalanceReconciliation,
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import {
	calculateBalanceDatasForMonths,
	calculateStartingBalanceForMonth,
} from '../balanceLogic';
import { createMonthKey } from '../util';

// Note: months are zero-based in the app (9 = October, 10 = November, 11 = December)

const OCT = { year: 2026, month: 9 };
const NOV = { year: 2026, month: 10 };
const DEC = { year: 2026, month: 11 };

function occurrence(
	name: string,
	type: 'income' | 'expense',
	amount: number,
	date: Date,
): TransactionOccurrence {
	return { name, type, amount, categoryId: 0, date };
}

/** Groups occurrences by month, sorted by date, as the balance cache does */
function byMonth(
	occurrences: TransactionOccurrence[],
): Map<string, TransactionOccurrencesMonthData> {
	const map = new Map<string, TransactionOccurrencesMonthData>();
	const sorted = [...occurrences].sort(
		(a, b) => a.date.getTime() - b.date.getTime(),
	);
	for (const o of sorted) {
		const monthKey = createMonthKey(
			o.date.getFullYear(),
			o.date.getMonth(),
		);
		const monthData = map.get(monthKey) ?? {
			monthKey,
			transactionOccurrences: [],
		};
		monthData.transactionOccurrences.push(o);
		map.set(monthKey, monthData);
	}
	return map;
}

function reconciliation(amount: number, date: Date): BalanceReconciliation {
	return { accountId: 1, amount, date };
}

/** Balance at the end of the given day (1-based) of a calculated month */
function balanceOn(
	month: ReturnType<typeof calculateBalanceDatasForMonths>[number],
	day: number,
) {
	return month.dailyBalances[day - 1]?.balance;
}

// Customer example: incomes and fixed expenses at the start of November 2026
const customerNovember = [
	occurrence('Social assistance', 'income', 460, new Date(2026, 10, 1)),
	occurrence('Rent', 'expense', 480, new Date(2026, 10, 3)),
	occurrence('Daily allowance', 'income', 580, new Date(2026, 10, 6)),
];

describe('calculateBalanceDatasForMonths', () => {
	it('keeps the balance unchanged on days without transactions', () => {
		const [november] = calculateBalanceDatasForMonths(
			new Map(),
			[],
			100,
			1,
			NOV,
			NOV,
		);

		expect(november.dailyBalances).toHaveLength(30);
		expect(balanceOn(november, 1)).toBe(100);
		expect(balanceOn(november, 30)).toBe(100);
		expect(november.startBalance).toBe(100);
		expect(november.endBalance).toBe(100);
	});

	it('adds income and subtracts expenses on their dates', () => {
		const [november] = calculateBalanceDatasForMonths(
			byMonth(customerNovember),
			[],
			0,
			1,
			NOV,
			NOV,
		);

		// 1.11. social assistance +460
		expect(balanceOn(november, 1)).toBe(460);
		expect(balanceOn(november, 2)).toBe(460);
		// 6.11. daily allowance +580
		expect(balanceOn(november, 6)).toBe(560);
		expect(november.endBalance).toBe(560);
	});

	it('shows a negative balance when expenses exceed the balance', () => {
		const [november] = calculateBalanceDatasForMonths(
			byMonth(customerNovember),
			[],
			0,
			1,
			NOV,
			NOV,
		);

		// 3.11. rent -480 -> 460 - 480 = -20 until the daily allowance on 6.11.
		expect(balanceOn(november, 3)).toBe(-20);
		expect(balanceOn(november, 5)).toBe(-20);
	});

	it('carries the end balance over to the next month', () => {
		const [november, december] = calculateBalanceDatasForMonths(
			byMonth([
				...customerNovember,
				occurrence('Rent', 'expense', 480, new Date(2026, 11, 3)),
			]),
			[],
			0,
			1,
			NOV,
			DEC,
		);

		expect(december.startBalance).toBe(november.endBalance);
		expect(balanceOn(december, 2)).toBe(560);
		// 3.12. rent -480
		expect(balanceOn(december, 3)).toBe(80);
		expect(december.dailyBalances).toHaveLength(31);
	});

	it('leaves days before the first known day empty', () => {
		// The balance 100 € is known only from 5.11.; the rent on 3.11. is already in it
		const [november] = calculateBalanceDatasForMonths(
			byMonth(customerNovember),
			[],
			100,
			5,
			NOV,
			NOV,
		);

		expect(november.dailyBalances[0]).toBeUndefined();
		expect(november.dailyBalances[3]).toBeUndefined();
		expect(november.startBalance).toBeUndefined();
		expect(balanceOn(november, 5)).toBe(100);
		// 6.11. daily allowance +580
		expect(balanceOn(november, 6)).toBe(680);
	});

	it('uses the reconciled balance on the reconciliation day', () => {
		// The user checks the bank on 15.11.: the real balance is 300 €
		const [november] = calculateBalanceDatasForMonths(
			byMonth([
				...customerNovember,
				occurrence('Phone', 'expense', 20, new Date(2026, 10, 20)),
			]),
			[reconciliation(300, new Date(2026, 10, 15))],
			0,
			1,
			NOV,
			NOV,
		);

		expect(balanceOn(november, 14)).toBe(560);
		expect(november.dailyBalances[14]).toEqual({
			balance: 300,
			isReconciled: true,
		});
		expect(november.dailyBalances[15]?.isReconciled).toBe(false);
		// 20.11. phone -20 continues from the reconciled balance
		expect(balanceOn(november, 20)).toBe(280);
	});
});

describe('calculateStartingBalanceForMonth', () => {
	it('starts from the reconciliation amount when there are no transactions', () => {
		const start = calculateStartingBalanceForMonth(
			new Map(),
			reconciliation(200, new Date(2026, 9, 31)),
			NOV,
		);

		expect(start).toBe(200);
	});

	it('adds transactions after the reconciliation', () => {
		// Bank balance 200 € on 15.10., streaming -40 € on 24.10.
		const start = calculateStartingBalanceForMonth(
			byMonth([
				occurrence('Phone', 'expense', 20, new Date(2026, 9, 11)),
				occurrence('Streaming', 'expense', 40, new Date(2026, 9, 24)),
			]),
			reconciliation(200, new Date(2026, 9, 15)),
			NOV,
		);

		// The phone bill on 11.10. is already included in the reconciled 200 €
		expect(start).toBe(160);
	});

	it('adds transactions from several months before the target month', () => {
		// 200 € on 15.9., gift +100 € on 20.9., rent -480 € on 3.10.
		const start = calculateStartingBalanceForMonth(
			byMonth([
				occurrence('Gift', 'income', 100, new Date(2026, 8, 20)),
				occurrence('Rent', 'expense', 480, new Date(2026, 9, 3)),
				// November transactions do not affect the starting balance of November
				occurrence('Rent', 'expense', 480, new Date(2026, 10, 3)),
			]),
			reconciliation(200, new Date(2026, 8, 15)),
			NOV,
		);

		expect(start).toBe(200 + 100 - 480);
	});

	it('returns the reconciliation amount for the reconciliation month itself', () => {
		const start = calculateStartingBalanceForMonth(
			byMonth([
				occurrence('Rent', 'expense', 480, new Date(2026, 10, 3)),
			]),
			reconciliation(500, new Date(2026, 9, 1)),
			OCT,
		);

		expect(start).toBe(500);
	});
});
