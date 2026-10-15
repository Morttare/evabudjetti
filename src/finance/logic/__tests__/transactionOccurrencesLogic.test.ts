import type {
	Persisted,
	PlannedTransaction,
	RealTransaction,
} from '@/src/dataModel';
import { generateTransactionOccurrences } from '../transactionOccurrencesLogic';
import { dateToDateKey } from '../util';

describe('generateTransactionOccurrences', () => {
	// Removing or moving one date must leave the rest of the recurrence generated.
	const planned: Persisted<PlannedTransaction> = {
		id: 1,
		accountId: 0,
		name: 'Weekly expense',
		categoryId: 1,
		amount: 20,
		startDate: new Date(2025, 0, 1),
		endDate: null,
		type: 'expense',
		recurrenceBase: 'week',
		recurrenceInterval: 1,
	};

	it('excludes only the deleted occurrence', () => {
		const occurrences = generateTransactionOccurrences(
			2025,
			0,
			2025,
			0,
			[planned],
			[],
			[
				{
					plannedTransactionId: planned.id,
					occurrenceDate: new Date(2025, 0, 1),
				},
			],
		);

		expect(occurrences.map(({ date }) => dateToDateKey(date))).toEqual([
			'2025-01-08',
			'2025-01-15',
			'2025-01-22',
			'2025-01-29',
		]);
	});

	it('moves one occurrence without restoring its source date', () => {
		const moved: Persisted<RealTransaction> = {
			id: 2,
			accountId: 0,
			name: 'Weekly expense',
			categoryId: 1,
			amount: 20,
			date: new Date(2025, 0, 3),
			type: 'expense',
			plannedTransactionId: planned.id,
			plannedOccurrenceDate: new Date(2025, 0, 1),
		};
		const occurrences = generateTransactionOccurrences(
			2025,
			0,
			2025,
			0,
			[planned],
			[moved],
		);

		expect(occurrences.map(({ date }) => dateToDateKey(date))).toEqual([
			'2025-01-03',
			'2025-01-08',
			'2025-01-15',
			'2025-01-22',
			'2025-01-29',
		]);
	});
});
