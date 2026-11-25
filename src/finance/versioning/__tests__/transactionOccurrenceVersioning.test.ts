import type { PlannedTransaction, RealTransaction } from '@/src/dataModel';
import { useTransactionOccurrenceVersioning } from '../transactionOccurrenceVersioning';

// Note: months are zero-based in the app (9 = October, 10 = November, 11 = December)

const versioning = () => useTransactionOccurrenceVersioning.getState();

/** Current versions as a plain object, e.g. { '2026-11': 1 } */
function versions() {
	return Object.fromEntries(versioning().versionsByMonthKey);
}

/** Starts tracking October–December 2026, all at version 0 */
function trackOctoberToDecember() {
	versioning().ensureTrackingInRange(2026, 9, 2026, 11);
}

function planned(overrides: Partial<PlannedTransaction>): PlannedTransaction {
	return {
		accountId: 1,
		categoryId: 0,
		name: 'Rent',
		amount: 480,
		type: 'expense',
		recurrenceBase: null,
		recurrenceInterval: 1,
		startDate: new Date(2026, 10, 3),
		endDate: null,
		...overrides,
	};
}

function real(date: Date): RealTransaction {
	return {
		accountId: 1,
		categoryId: 0,
		name: 'Groceries',
		amount: 35,
		type: 'expense',
		date,
		plannedTransactionId: null,
	};
}

beforeEach(() => {
	useTransactionOccurrenceVersioning.setState({
		versionsByMonthKey: new Map(),
	});
	// The store logs every change; keep the test output clean
	jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('tracking months', () => {
	it('starts tracking every month in the range at version 0', () => {
		trackOctoberToDecember();

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 0,
		});
	});

	it('does not reset months that are already tracked', () => {
		trackOctoberToDecember();
		versioning().onRealTransactionCreated(real(new Date(2026, 10, 12)));

		trackOctoberToDecember();

		expect(versions()['2026-11']).toBe(1);
	});

	it('returns version 0 for months that are not tracked', () => {
		const result = versioning().getVersionsByMonth(2026, 10, 2027, 0);

		expect(Object.fromEntries(result)).toEqual({
			'2026-11': 0,
			'2026-12': 0,
			'2027-01': 0,
		});
	});

	it('raises the version of every tracked month when all are invalidated', () => {
		trackOctoberToDecember();

		versioning().invalidateTrackedMonths();

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 1,
		});
	});
});

describe('real transactions', () => {
	it('raises the version of the month of a new transaction', () => {
		trackOctoberToDecember();

		versioning().onRealTransactionCreated(real(new Date(2026, 10, 12)));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 0,
		});
	});

	it('ignores a new transaction in a month that is not tracked', () => {
		trackOctoberToDecember();

		versioning().onRealTransactionCreated(real(new Date(2027, 2, 1)));

		expect(versions()['2027-03']).toBeUndefined();
	});

	it('raises both months when a transaction is moved to another month', () => {
		// Groceries moved from 28.11. to 2.12.
		trackOctoberToDecember();

		versioning().onRealTransactionUpdated(
			real(new Date(2026, 10, 28)),
			real(new Date(2026, 11, 2)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
		});
	});

	it('raises the version on delete even if the month is not tracked', () => {
		versioning().onRealTransactionDeleted(real(new Date(2026, 10, 12)));

		expect(versions()).toEqual({ '2026-11': 1 });
	});
});

describe('planned transactions', () => {
	it('raises only the start month of a one-time transaction', () => {
		trackOctoberToDecember();

		versioning().onPlannedTransactionCreated(planned({}));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 0,
		});
	});

	it('raises every month from the start of a recurring transaction', () => {
		// Rent on the 3rd of every month from November
		trackOctoberToDecember();

		versioning().onPlannedTransactionCreated(
			planned({ recurrenceBase: 'month' }),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
		});
	});

	it('does not raise months after the end date', () => {
		trackOctoberToDecember();

		versioning().onPlannedTransactionDeleted(
			planned({
				recurrenceBase: 'month',
				startDate: new Date(2026, 9, 3),
				endDate: new Date(2026, 10, 15),
			}),
		);

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 0,
		});
	});

	it('raises the old and the new month when the date is changed', () => {
		// One-time payment moved from 3.12. to 3.10.
		trackOctoberToDecember();

		versioning().onPlannedTransactionUpdated(
			planned({ startDate: new Date(2026, 11, 3) }),
			planned({ startDate: new Date(2026, 9, 3) }),
		);

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 0,
			'2026-12': 1,
		});
	});

	it('raises the month of a changed single occurrence', () => {
		// e.g. the December rent was skipped
		versioning().onPlannedOccurrenceChanged(new Date(2026, 11, 3));

		expect(versions()).toEqual({ '2026-12': 1 });
	});
});
