import type {
	BalanceReconciliation,
	PlannedTransaction,
	RealTransaction,
} from '@/src/dataModel';
import { useBalanceVersioning } from '../balanceVersioning';

// Note: months are zero-based in the app (9 = October, 10 = November, 11 = December)
//
// A balance carries over to the next month, so a change in one month
// must also refresh the balances of every later month.

const versioning = () => useBalanceVersioning.getState();

/** Current versions as a plain object, e.g. { '2026-11': 1 } */
function versions() {
	return Object.fromEntries(versioning().versionsByMonthKey);
}

/** Starts tracking October 2026 – January 2027, all at version 0 */
function trackOctoberToJanuary() {
	versioning().ensureTrackingInRange(2026, 9, 2027, 0);
}

function planned(startDate: Date): PlannedTransaction {
	return {
		accountId: 1,
		categoryId: 0,
		name: 'Rent',
		amount: 480,
		type: 'expense',
		recurrenceBase: 'month',
		recurrenceInterval: 1,
		startDate,
		endDate: null,
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

function reconciliation(amount: number, date: Date): BalanceReconciliation {
	return { accountId: 1, amount, date };
}

beforeEach(() => {
	useBalanceVersioning.setState({ versionsByMonthKey: new Map() });
	// The store logs every change; keep the test output clean
	jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('tracking months', () => {
	it('starts tracking every month in the range at version 0', () => {
		trackOctoberToJanuary();

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 0,
			'2027-01': 0,
		});
	});

	it('does not reset months that are already tracked', () => {
		trackOctoberToJanuary();
		versioning().onRealTransactionCreated(real(new Date(2027, 0, 5)));

		trackOctoberToJanuary();

		expect(versions()['2027-01']).toBe(1);
	});

	it('returns version 0 for months that are not tracked', () => {
		const result = versioning().getVersionsByMonth(2026, 10, 2026, 11);

		expect(Object.fromEntries(result)).toEqual({
			'2026-11': 0,
			'2026-12': 0,
		});
	});

	it('raises the version of every tracked month when all are invalidated', () => {
		trackOctoberToJanuary();

		versioning().invalidateTrackedMonths();

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});
});

describe('real transactions', () => {
	it('raises the month of a new transaction and every later month', () => {
		// Groceries on 12.11. change the balance of November and all months after it
		trackOctoberToJanuary();

		versioning().onRealTransactionCreated(real(new Date(2026, 10, 12)));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('continues over the turn of the year', () => {
		trackOctoberToJanuary();

		versioning().onRealTransactionCreated(real(new Date(2026, 11, 20)));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises every tracked month for a transaction before them', () => {
		trackOctoberToJanuary();

		versioning().onRealTransactionCreated(real(new Date(2026, 8, 30)));

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('does not change anything for a transaction after the tracked months', () => {
		trackOctoberToJanuary();

		versioning().onRealTransactionCreated(real(new Date(2027, 2, 1)));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 0,
			'2027-01': 0,
		});
	});

	it('raises months from the earlier date when a transaction is moved', () => {
		// Groceries moved from 2.12. back to 28.10.
		trackOctoberToJanuary();

		versioning().onRealTransactionUpdated(
			real(new Date(2026, 11, 2)),
			real(new Date(2026, 9, 28)),
		);

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises the month of a deleted transaction and every later month', () => {
		trackOctoberToJanuary();

		versioning().onRealTransactionDeleted(real(new Date(2026, 11, 2)));

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 1,
			'2027-01': 1,
		});
	});
});

describe('planned transactions', () => {
	it('raises months from the start date of a new planned transaction', () => {
		// Rent on the 3rd of every month from November
		trackOctoberToJanuary();

		versioning().onPlannedTransactionCreated(
			planned(new Date(2026, 10, 3)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises months from the earlier start date when the start is changed', () => {
		// Rent start moved from 3.12. to 3.11.
		trackOctoberToJanuary();

		versioning().onPlannedTransactionUpdated(
			planned(new Date(2026, 11, 3)),
			planned(new Date(2026, 10, 3)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises months from the start date of a deleted planned transaction', () => {
		trackOctoberToJanuary();

		versioning().onPlannedTransactionDeleted(
			planned(new Date(2026, 11, 3)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 1,
			'2027-01': 1,
		});
	});
});

describe('balance reconciliations', () => {
	it('raises months from the date of a new reconciliation', () => {
		// The user checks the bank on 15.11.: the real balance is 300 €
		trackOctoberToJanuary();

		versioning().onBalanceReconciliationCreated(
			reconciliation(300, new Date(2026, 10, 15)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises months from the earlier date when a reconciliation is moved', () => {
		// Reconciliation date corrected from 15.12. to 15.10.
		trackOctoberToJanuary();

		versioning().onBalanceReconciliationUpdated(
			reconciliation(300, new Date(2026, 11, 15)),
			reconciliation(300, new Date(2026, 9, 15)),
		);

		expect(versions()).toEqual({
			'2026-10': 1,
			'2026-11': 1,
			'2026-12': 1,
			'2027-01': 1,
		});
	});

	it('raises months from the date of a deleted reconciliation', () => {
		trackOctoberToJanuary();

		versioning().onBalanceReconciliationDeleted(
			reconciliation(300, new Date(2026, 11, 15)),
		);

		expect(versions()).toEqual({
			'2026-10': 0,
			'2026-11': 0,
			'2026-12': 1,
			'2027-01': 1,
		});
	});
});
