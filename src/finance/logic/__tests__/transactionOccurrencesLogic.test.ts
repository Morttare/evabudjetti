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

	it('keeps same-date planned occurrences in input order before real transactions', () => {
		const firstInput: Persisted<PlannedTransaction> = {
			...planned,
			id: 2,
			name: 'First input',
		};
		const secondInput: Persisted<PlannedTransaction> = {
			...planned,
			id: 3,
			name: 'Second input',
		};
		const real: Persisted<RealTransaction> = {
			id: 4,
			accountId: 0,
			name: 'Real transaction',
			categoryId: 1,
			amount: 5,
			date: new Date(2025, 0, 8),
			type: 'expense',
			plannedTransactionId: null,
		};

		const occurrences = generateTransactionOccurrences(
			2025,
			0,
			2025,
			0,
			[secondInput, firstInput],
			[real],
		);

		expect(
			occurrences.map(
				({ date, name }) => `${dateToDateKey(date)}:${name}`,
			),
		).toEqual([
			'2025-01-01:Second input',
			'2025-01-01:First input',
			'2025-01-08:Second input',
			'2025-01-08:First input',
			'2025-01-08:Real transaction',
			'2025-01-15:Second input',
			'2025-01-15:First input',
			'2025-01-22:Second input',
			'2025-01-22:First input',
			'2025-01-29:Second input',
			'2025-01-29:First input',
		]);
	});
});
