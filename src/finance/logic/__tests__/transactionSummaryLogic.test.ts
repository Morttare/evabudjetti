import type {
	TransactionOccurrence,
	TransactionOccurrencesMonthData,
} from '@/src/dataModel';
import { calculateTransactionSummaryForMonth } from '../transactionSummaryLogic';

// Note: months are zero-based in the app (10 = November)

const BENEFITS = 1;
const HOUSING = 2;
const SUBSCRIPTIONS = 3;

function occurrence(
	name: string,
	type: 'income' | 'expense',
	amount: number,
	categoryId: number,
	day: number,
): TransactionOccurrence {
	return {
		name,
		type,
		amount,
		categoryId,
		date: new Date(2026, 10, day),
	};
}

function november(
	transactionOccurrences: TransactionOccurrence[],
): TransactionOccurrencesMonthData {
	return { monthKey: '2026-11', transactionOccurrences };
}

// Customer example: incomes and fixed expenses in November 2026
const customerNovember = november([
	occurrence('Social assistance', 'income', 460, BENEFITS, 1),
	occurrence('Housing allowance', 'income', 250, BENEFITS, 2),
	occurrence('Rent', 'expense', 480, HOUSING, 3),
	occurrence('Daily allowance', 'income', 580, BENEFITS, 6),
	occurrence('Phone', 'expense', 20, SUBSCRIPTIONS, 11),
	occurrence('Streaming', 'expense', 40, SUBSCRIPTIONS, 24),
]);

describe('calculateTransactionSummaryForMonth', () => {
	it('creates the correct month key', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			customerNovember,
		);

		expect(summary.monthKey).toBe('2026-11');
	});

	it('returns zero totals for a month without transactions', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			november([]),
		);

		expect(summary.totalIncome).toBe(0);
		expect(summary.totalExpense).toBe(0);
		expect(summary.cashFlow).toBe(0);
		expect(summary.incomeByCategory.size).toBe(0);
		expect(summary.expenseByCategory.size).toBe(0);
	});

	it('sums incomes and expenses separately', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			customerNovember,
		);

		// 460 + 250 + 580
		expect(summary.totalIncome).toBe(1290);
		// 480 + 20 + 40
		expect(summary.totalExpense).toBe(540);
	});

	it('calculates cash flow as income minus expenses', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			customerNovember,
		);

		expect(summary.cashFlow).toBe(1290 - 540);
	});

	it('gives a negative cash flow when expenses are larger than incomes', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			november([
				occurrence('Housing allowance', 'income', 250, BENEFITS, 2),
				occurrence('Rent', 'expense', 480, HOUSING, 3),
			]),
		);

		expect(summary.cashFlow).toBe(-230);
	});

	it('groups transactions by category', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			customerNovember,
		);

		expect([...summary.incomeByCategory.keys()]).toEqual([BENEFITS]);
		expect([...summary.expenseByCategory.keys()]).toEqual([
			HOUSING,
			SUBSCRIPTIONS,
		]);
		expect(summary.expenseByCategory.get(HOUSING)?.totalAmount).toBe(480);
	});

	it('adds several transactions of the same category together', () => {
		const summary = calculateTransactionSummaryForMonth(
			2026,
			10,
			customerNovember,
		);

		const subscriptions = summary.expenseByCategory.get(SUBSCRIPTIONS);
		// Phone 20 € + streaming 40 €
		expect(subscriptions?.totalAmount).toBe(60);
		expect(
			subscriptions?.transactionOccurrences.map((o) => o.name),
		).toEqual(['Phone', 'Streaming']);
	});
});
