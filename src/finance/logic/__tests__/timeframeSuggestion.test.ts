import type { PlannedTransaction } from '@/src/dataModel';
import {
	findLargestRecurringIncome,
	suggestTimeframe,
} from '../timeframeSuggestion';

function planned(overrides: Partial<PlannedTransaction>): PlannedTransaction {
	return {
		accountId: 1,
		categoryId: 0,
		name: 'Income',
		amount: 100,
		type: 'income',
		recurrenceBase: 'month',
		recurrenceInterval: 1,
		startDate: new Date(2026, 0, 1),
		endDate: null,
		...overrides,
	} as PlannedTransaction;
}

// Customer example: daily allowance 580 € every 4 weeks from 6 Nov 2026
const dailyAllowance = planned({
	name: 'Daily allowance',
	amount: 580,
	recurrenceBase: 'week',
	recurrenceInterval: 4,
	startDate: new Date(2026, 10, 6),
});
const housingAllowance = planned({
	name: 'Housing allowance',
	amount: 250,
	startDate: new Date(2026, 10, 2),
});
const oneTimeGift = planned({
	name: 'Gift',
	amount: 1000,
	recurrenceBase: null,
	startDate: new Date(2026, 11, 15),
});
const rent = planned({ name: 'Rent', amount: 480, type: 'expense' });

describe('findLargestRecurringIncome', () => {
	it('ignores expenses and one-time incomes', () => {
		expect(
			findLargestRecurringIncome([
				housingAllowance,
				dailyAllowance,
				oneTimeGift,
				rent,
			]),
		).toBe(dailyAllowance);
	});

	it('returns undefined when there are no recurring incomes', () => {
		expect(findLargestRecurringIncome([oneTimeGift, rent])).toBeUndefined();
	});
});

describe('suggestTimeframe', () => {
	const transactions = [housingAllowance, dailyAllowance, oneTimeGift, rent];

	it('uses the payment interval of the largest income as the length', () => {
		const suggestion = suggestTimeframe(
			transactions,
			new Date(2026, 10, 10),
		);
		expect(suggestion?.basedOn).toBe(dailyAllowance);
		expect(suggestion?.length).toBe(4);
		expect(suggestion?.type).toBe('weeks');
	});

	it('starts on the latest payment day before the date', () => {
		// Payments 6 Nov, 4 Dec, 1 Jan -> on 10 Dec the timeframe started 4 Dec
		const suggestion = suggestTimeframe(
			transactions,
			new Date(2026, 11, 10),
		);
		expect(suggestion?.startDate).toEqual(new Date(2026, 11, 4));
	});

	it('starts on the payment day itself', () => {
		const suggestion = suggestTimeframe(
			transactions,
			new Date(2026, 11, 4),
		);
		expect(suggestion?.startDate).toEqual(new Date(2026, 11, 4));
	});

	it('starts on the first payment when the income has not started yet', () => {
		const suggestion = suggestTimeframe(
			transactions,
			new Date(2026, 10, 1),
		);
		expect(suggestion?.startDate).toEqual(new Date(2026, 10, 6));
	});

	it('returns undefined when the largest income has ended', () => {
		const ended = planned({
			amount: 2000,
			startDate: new Date(2025, 0, 1),
			endDate: new Date(2025, 5, 1),
		});
		expect(
			suggestTimeframe([ended], new Date(2026, 10, 10)),
		).toBeUndefined();
	});

	it('returns undefined when there are no recurring incomes', () => {
		expect(suggestTimeframe([oneTimeGift, rent])).toBeUndefined();
	});
});
