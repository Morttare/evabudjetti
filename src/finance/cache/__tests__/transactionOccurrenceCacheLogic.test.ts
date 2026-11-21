import type { TransactionOccurrence } from '@/src/dataModel';
import {
	findTransactionOccurrenceMonthRange,
	groupTransactionOccurrencesByMonth,
} from '../transactionOccurrenceCacheLogic';

function occurrence(month: number, day: number): TransactionOccurrence {
	return {
		name: 'Test',
		categoryId: 1,
		amount: 10,
		date: new Date(2026, month, day),
		type: 'expense',
	};
}

describe('findTransactionOccurrenceMonthRange', () => {
	it('returns no range when every month is fresh', () => {
		const cached = new Map([
			[
				'2026-11',
				{
					monthKey: '2026-11',
					transactionOccurrences: [],
					version: 2,
				},
			],
			[
				'2026-12',
				{
					monthKey: '2026-12',
					transactionOccurrences: [],
					version: 2,
				},
			],
		]);

		expect(
			findTransactionOccurrenceMonthRange(
				2026,
				10,
				2026,
				11,
				new Map([
					['2026-11', 2],
					['2026-12', 2],
				]),
				cached,
			),
		).toBeUndefined();
	});

	it('finds the first and last stale month', () => {
		const cached = new Map([
			[
				'2026-11',
				{
					monthKey: '2026-11',
					transactionOccurrences: [],
					version: 1,
				},
			],
			[
				'2026-12',
				{
					monthKey: '2026-12',
					transactionOccurrences: [],
					version: 3,
				},
			],
		]);

		expect(
			findTransactionOccurrenceMonthRange(
				2026,
				10,
				2027,
				0,
				new Map([
					['2026-11', 2],
					['2026-12', 2],
					['2027-01', 1],
				]),
				cached,
			),
		).toEqual({
			first: { year: 2026, month: 10 },
			last: { year: 2027, month: 0 },
		});
	});

	it('uses missing cache entries as stale months', () => {
		const cached = new Map([
			[
				'2026-11',
				{
					monthKey: '2026-11',
					transactionOccurrences: [],
					version: 5,
				},
			],
			[
				'2027-01',
				{
					monthKey: '2027-01',
					transactionOccurrences: [],
					version: 5,
				},
			],
		]);

		expect(
			findTransactionOccurrenceMonthRange(
				2026,
				10,
				2027,
				0,
				new Map([
					['2026-11', 5],
					['2026-12', 1],
					['2027-01', 5],
				]),
				cached,
			),
		).toEqual({
			first: { year: 2026, month: 11 },
			last: { year: 2026, month: 11 },
		});
	});
});

describe('groupTransactionOccurrencesByMonth', () => {
	it('creates empty entries for every month and groups occurrences', () => {
		const range = {
			first: { year: 2026, month: 10 },
			last: { year: 2026, month: 11 },
		};

		const result = groupTransactionOccurrencesByMonth(
			[occurrence(10, 3), occurrence(11, 5)],
			range,
			new Map([
				['2026-11', 4],
				['2026-12', 5],
			]),
		);

		expect(result).toEqual([
			{
				monthKey: '2026-11',
				transactionOccurrences: [occurrence(10, 3)],
				version: 4,
			},
			{
				monthKey: '2026-12',
				transactionOccurrences: [occurrence(11, 5)],
				version: 5,
			},
		]);
	});

	it('rejects occurrences outside the update range', () => {
		expect(() =>
			groupTransactionOccurrencesByMonth(
				[occurrence(9, 30)],
				{
					first: { year: 2026, month: 10 },
					last: { year: 2026, month: 10 },
				},
				new Map(),
			),
		).toThrow(/outside the update range/);
	});

	it('marks a month with no occurrences as empty and fresh', () => {
		const result = groupTransactionOccurrencesByMonth(
			[],
			{
				first: { year: 2026, month: 10 },
				last: { year: 2026, month: 11 },
			},
			new Map([
				['2026-11', 3],
				['2026-12', 3],
			]),
		);

		expect(result).toEqual([
			{
				monthKey: '2026-11',
				transactionOccurrences: [],
				version: 3,
			},
			{
				monthKey: '2026-12',
				transactionOccurrences: [],
				version: 3,
			},
		]);
	});
});
