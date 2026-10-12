import { min } from 'date-fns';
import { create } from 'zustand';
import type {
	BalanceReconciliation,
	PlannedTransaction,
	RealTransaction,
} from '@/src/dataModel';
import { createMonthKey, decodeMonthKey, monthsInRange } from '../logic/util';

export interface BalanceVersioning {
	versionsByMonthKey: Map<string, number>;

	/**
	 * Ensures that the given month range is tracked for balance versioning.
	 * Missing tracked months are initialized to version 0.
	 */
	ensureTrackingInRange: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
	) => void;

	/**
	 * Gets the version number for each month in the given range.
	 * Each month that doesn't have version information will have a version of 0 in the returned map.
	 */
	getVersionsByMonth: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
	) => Map<string, number>;
	invalidateTrackedMonths: () => void;

	onPlannedTransactionCreated: (created: PlannedTransaction) => void;
	onPlannedTransactionUpdated: (
		old: PlannedTransaction,
		updated: PlannedTransaction,
	) => void;
	onPlannedTransactionDeleted: (deleted: PlannedTransaction) => void;

	onRealTransactionCreated: (created: RealTransaction) => void;
	onRealTransactionUpdated: (
		old: RealTransaction,
		updated: RealTransaction,
	) => void;
	onRealTransactionDeleted: (deleted: RealTransaction) => void;

	onBalanceReconciliationCreated: (created: BalanceReconciliation) => void;
	onBalanceReconciliationUpdated: (
		old: BalanceReconciliation,
		updated: BalanceReconciliation,
	) => void;
	onBalanceReconciliationDeleted: (deleted: BalanceReconciliation) => void;
}

export const useBalanceVersioning = create<BalanceVersioning>((set, get) => ({
	versionsByMonthKey: new Map(),

	ensureTrackingInRange: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
	) => {
		const updates = [];

		for (const { year, month } of monthsInRange(
			startYear,
			startMonth,
			endYear,
			endMonth,
		)) {
			const monthKey = createMonthKey(year, month);
			const version = get().versionsByMonthKey.get(monthKey);

			if (version === undefined) {
				updates.push({ monthKey, version: 0 });
			}
		}

		if (updates.length > 0) {
			const newVersions = new Map(get().versionsByMonthKey);

			for (const { monthKey, version } of updates) {
				newVersions.set(monthKey, version);
			}

			set({ versionsByMonthKey: newVersions });
		}
	},

	getVersionsByMonth: (
		startYear: number,
		startMonth: number,
		endYear: number,
		endMonth: number,
	) => {
		const versions = new Map<string, number>();

		for (const { year, month } of monthsInRange(
			startYear,
			startMonth,
			endYear,
			endMonth,
		)) {
			const monthKey = createMonthKey(year, month);
			const version = get().versionsByMonthKey.get(monthKey) ?? 0;
			versions.set(monthKey, version);
		}

		return versions;
	},
	invalidateTrackedMonths: () => {
		set((state) => {
			if (state.versionsByMonthKey.size === 0) return {};

			const versionsByMonthKey = new Map(state.versionsByMonthKey);
			for (const [monthKey, version] of versionsByMonthKey) {
				versionsByMonthKey.set(monthKey, version + 1);
			}

			return { versionsByMonthKey };
		});
	},

	onPlannedTransactionCreated: (created: PlannedTransaction) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const changed = incrementTrackedVersionsFromDate(
				created.startDate,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onPlannedTransactionCreated: changed=${changed}, startMonth=${monthKeyFromDate(created.startDate)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onPlannedTransactionUpdated: (
		old: PlannedTransaction,
		updated: PlannedTransaction,
	) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const triggerDate = min([old.startDate, updated.startDate]);
			const changed = incrementTrackedVersionsFromDate(
				triggerDate,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onPlannedTransactionUpdated: changed=${changed}, oldStartMonth=${monthKeyFromDate(old.startDate)}, updatedStartMonth=${monthKeyFromDate(updated.startDate)}, triggerMonth=${monthKeyFromDate(triggerDate)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onPlannedTransactionDeleted: (deleted: PlannedTransaction) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const changed = incrementTrackedVersionsFromDate(
				deleted.startDate,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onPlannedTransactionDeleted: changed=${changed}, startMonth=${monthKeyFromDate(deleted.startDate)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onRealTransactionCreated: (created: RealTransaction) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);

			const changed = incrementTrackedVersionsFromDate(
				created.date,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);

			console.debug(
				`[BalanceVersioning] onRealTransactionCreated: changed=${changed}, month=${monthKeyFromDate(created.date)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onRealTransactionUpdated: (
		old: RealTransaction,
		updated: RealTransaction,
	) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const triggerDate = min([old.date, updated.date]);
			const changed = incrementTrackedVersionsFromDate(
				triggerDate,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onRealTransactionUpdated: changed=${changed}, oldMonth=${monthKeyFromDate(old.date)}, updatedMonth=${monthKeyFromDate(updated.date)}, triggerMonth=${monthKeyFromDate(triggerDate)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onRealTransactionDeleted: (deleted: RealTransaction) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const changed = incrementTrackedVersionsFromDate(
				deleted.date,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onRealTransactionDeleted: changed=${changed}, month=${monthKeyFromDate(deleted.date)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onBalanceReconciliationCreated: (created: BalanceReconciliation) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const changed = incrementTrackedVersionsFromDate(
				created.date,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onBalanceReconciliationCreated: changed=${changed}, month=${monthKeyFromDate(created.date)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onBalanceReconciliationUpdated: (
		old: BalanceReconciliation,
		updated: BalanceReconciliation,
	) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const triggerDate = min([old.date, updated.date]);
			const changed = incrementTrackedVersionsFromDate(
				triggerDate,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onBalanceReconciliationUpdated: changed=${changed}, oldMonth=${monthKeyFromDate(old.date)}, updatedMonth=${monthKeyFromDate(updated.date)}, triggerMonth=${monthKeyFromDate(triggerDate)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},

	onBalanceReconciliationDeleted: (deleted: BalanceReconciliation) => {
		set((state) => {
			const oldVersions = new Map(state.versionsByMonthKey);
			const newVersions = new Map(state.versionsByMonthKey);
			const changed = incrementTrackedVersionsFromDate(
				deleted.date,
				newVersions,
			);

			const changedMonths = collectChangedMonths(
				oldVersions,
				newVersions,
			);
			console.debug(
				`[BalanceVersioning] onBalanceReconciliationDeleted: changed=${changed}, month=${monthKeyFromDate(deleted.date)}, affectedMonths=[${changedMonths.join(', ')}]`,
			);

			return changed ? { versionsByMonthKey: newVersions } : {};
		});
	},
}));

function monthKeyFromDate(date: Date): string {
	return createMonthKey(date.getFullYear(), date.getMonth());
}

function collectChangedMonths(
	previousVersionsByMonthKey: Map<string, number>,
	nextVersionsByMonthKey: Map<string, number>,
): string[] {
	const changedMonths: string[] = [];

	for (const [monthKey, newVersion] of nextVersionsByMonthKey.entries()) {
		const oldVersion = previousVersionsByMonthKey.get(monthKey);

		if (oldVersion !== newVersion) {
			changedMonths.push(`${monthKey}:${oldVersion}->${newVersion}`);
		}
	}

	return changedMonths;
}

function incrementTrackedVersionsFromDate(
	startDate: Date,
	versionsByMonthKey: Map<string, number>,
): boolean {
	const startYear = startDate.getFullYear();
	const startMonth = startDate.getMonth();
	let changed = false;

	for (const [monthKey, currentVersion] of versionsByMonthKey.entries()) {
		const { year, month } = decodeMonthKey(monthKey);

		if (year > startYear || (year === startYear && month >= startMonth)) {
			versionsByMonthKey.set(monthKey, currentVersion + 1);
			changed = true;
		}
	}

	return changed;
}
