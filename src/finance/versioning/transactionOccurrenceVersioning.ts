import { create } from 'zustand';
import type { PlannedTransaction, RealTransaction } from '@/src/dataModel';
import {
	createMonthKey,
	dateToMonthKey,
	monthsInRange,
	plannedTransactionIsActiveInMonth,
} from '../logic/util';

export interface TransactionOccurrenceVersioning {
	versionsByMonthKey: Map<string, number>;

	/**
	 * Ensures that the given month range is being tracked for versioning.
	 * If there is already version information for any month in the range, does nothing, otherwise initializes the version information for the months in the range to 0.
	 *
	 * @param startYear The year of the first month to include
	 * @param startMonth The first month (0-11) to include
	 * @param endYear The year of the last month to include
	 * @param endMonth The last month (0-11) to include
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
	 *
	 * @param startYear The year of the first month to include
	 * @param startMonth The first month (0-11) to include
	 * @param endYear The year of the last month to include
	 * @param endMonth The last month (0-11) to include
	 * @returns A map of month keys to their version numbers
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
}

export const useTransactionOccurrenceVersioning =
	create<TransactionOccurrenceVersioning>((set, get) => ({
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
					// Mark this month as version 0 to catch any updates before the data has been fetched
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

				const changed = incrementMonthVersionsForPlannedTransaction(
					created,
					newVersions,
				);

				const changedMonths = collectChangedMonths(
					oldVersions,
					newVersions,
				);
				console.debug(
					`[TransactionOccurrenceVersioning] onPlannedTransactionCreated: changed=${changed}, startMonth=${dateToMonthKey(created.startDate)}, isRecurring=${created.recurrenceBase != null}, affectedMonths=[${changedMonths.join(', ')}]`,
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

				const oldChanged = incrementMonthVersionsForPlannedTransaction(
					old,
					newVersions,
				);
				const updatedChanged =
					incrementMonthVersionsForPlannedTransaction(
						updated,
						newVersions,
					);
				const changed = oldChanged || updatedChanged;

				const changedMonths = collectChangedMonths(
					oldVersions,
					newVersions,
				);
				console.debug(
					`[TransactionOccurrenceVersioning] onPlannedTransactionUpdated: oldChanged=${oldChanged}, updatedChanged=${updatedChanged}, changed=${changed}, oldStartMonth=${dateToMonthKey(old.startDate)}, updatedStartMonth=${dateToMonthKey(updated.startDate)}, oldRecurring=${old.recurrenceBase != null}, updatedRecurring=${updated.recurrenceBase != null}, affectedMonths=[${changedMonths.join(', ')}]`,
				);

				return changed ? { versionsByMonthKey: newVersions } : {};
			});
		},

		onPlannedTransactionDeleted: (deleted: PlannedTransaction) => {
			set((state) => {
				const oldVersions = new Map(state.versionsByMonthKey);
				const newVersions = new Map(state.versionsByMonthKey);

				const changed = incrementMonthVersionsForPlannedTransaction(
					deleted,
					newVersions,
				);

				const changedMonths = collectChangedMonths(
					oldVersions,
					newVersions,
				);
				console.debug(
					`[TransactionOccurrenceVersioning] onPlannedTransactionDeleted: changed=${changed}, startMonth=${dateToMonthKey(deleted.startDate)}, isRecurring=${deleted.recurrenceBase != null}, affectedMonths=[${changedMonths.join(', ')}]`,
				);

				return changed ? { versionsByMonthKey: newVersions } : {};
			});
		},

		onRealTransactionCreated: (created: RealTransaction) => {
			set((state) => {
				const oldVersions = new Map(state.versionsByMonthKey);
				const monthKey = dateToMonthKey(created.date);
				const oldVersion = state.versionsByMonthKey.get(monthKey);

				const updatedVersions =
					incrementMonthVersionsForRealTransaction(
						created,
						state.versionsByMonthKey,
					);
				const changed = updatedVersions !== undefined;

				const newVersion = updatedVersions?.get(monthKey);
				const changedMonths = updatedVersions
					? collectChangedMonths(oldVersions, updatedVersions)
					: [];
				console.debug(
					`[TransactionOccurrenceVersioning] onRealTransactionCreated: month=${monthKey}, oldVersion=${oldVersion}, newVersion=${newVersion}, changed=${changed}, isTracked=${oldVersion !== undefined}, affectedMonths=[${changedMonths.join(', ')}]`,
				);

				return changed ? { versionsByMonthKey: updatedVersions } : {};
			});
		},

		onRealTransactionUpdated: (
			old: RealTransaction,
			updated: RealTransaction,
		) => {
			set((state) => {
				const oldVersions = new Map(state.versionsByMonthKey);
				const oldMonthKey = dateToMonthKey(old.date);
				const updatedMonthKey = dateToMonthKey(updated.date);
				const oldMonthOldVersion =
					state.versionsByMonthKey.get(oldMonthKey);
				const updatedMonthOldVersion =
					state.versionsByMonthKey.get(updatedMonthKey);

				const oldIncrementedVersions =
					incrementMonthVersionsForRealTransaction(
						old,
						state.versionsByMonthKey,
					);
				const oldChanged = oldIncrementedVersions !== undefined;

				const updatedIncrementedVersions =
					incrementMonthVersionsForRealTransaction(
						updated,
						oldIncrementedVersions ?? state.versionsByMonthKey,
					);
				const updatedChanged = updatedIncrementedVersions !== undefined;

				const newVersions =
					updatedIncrementedVersions ?? oldIncrementedVersions;
				const changed = newVersions !== undefined;
				const changedMonths = newVersions
					? collectChangedMonths(oldVersions, newVersions)
					: [];

				const oldMonthNewVersion = newVersions?.get(oldMonthKey);
				const updatedMonthNewVersion =
					newVersions?.get(updatedMonthKey);

				console.debug(
					`[TransactionOccurrenceVersioning] onRealTransactionUpdated: oldMonth=${oldMonthKey}, updatedMonth=${updatedMonthKey}, oldChanged=${oldChanged}, updatedChanged=${updatedChanged}, changed=${changed}, oldMonthOldVersion=${oldMonthOldVersion}, oldMonthNewVersion=${oldMonthNewVersion}, updatedMonthOldVersion=${updatedMonthOldVersion}, updatedMonthNewVersion=${updatedMonthNewVersion}, oldMonthTracked=${oldMonthOldVersion !== undefined}, updatedMonthTracked=${updatedMonthOldVersion !== undefined}, affectedMonths=[${changedMonths.join(', ')}]`,
				);

				return changed ? { versionsByMonthKey: newVersions } : {};
			});
		},

		onRealTransactionDeleted: (deleted: RealTransaction) => {
			set((state) => {
				const oldVersions = new Map(state.versionsByMonthKey);
				const monthKey = dateToMonthKey(deleted.date);
				const oldVersion = state.versionsByMonthKey.get(monthKey);

				// Always bump the version, even if the month wasn't previously tracked.
				// Skipping untracked months would silently prevent cache invalidation.
				const newVersions = new Map(state.versionsByMonthKey);
				newVersions.set(monthKey, (oldVersion ?? 0) + 1);

				const changedMonths = collectChangedMonths(
					oldVersions,
					newVersions,
				);
				const newVersion = newVersions.get(monthKey);

				console.debug(
					`[TransactionOccurrenceVersioning] onRealTransactionDeleted: month=${monthKey}, oldVersion=${oldVersion}, newVersion=${newVersion}, isTracked=${oldVersion !== undefined}, affectedMonths=[${changedMonths.join(', ')}]`,
				);

				return { versionsByMonthKey: newVersions };
			});
		},
	}));

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

function incrementMonthVersionsForPlannedTransaction(
	transaction: PlannedTransaction,
	versionsByMonthKey: Map<string, number>,
): boolean {
	if (transaction.recurrenceBase == null) {
		const monthKey = dateToMonthKey(transaction.startDate);
		const currentVersion = versionsByMonthKey.get(monthKey);

		if (currentVersion === undefined) {
			return false;
		}

		versionsByMonthKey.set(monthKey, currentVersion + 1);
		return true;
	}

	let changed = false;

	for (const [monthKey, currentVersion] of versionsByMonthKey.entries()) {
		if (plannedTransactionIsActiveInMonth(transaction, monthKey)) {
			versionsByMonthKey.set(monthKey, currentVersion + 1);
			changed = true;
		}
	}

	return changed;
}

function incrementMonthVersionsForRealTransaction(
	transaction: RealTransaction,
	versionsByMonthKey: Map<string, number>,
): Map<string, number> | undefined {
	const monthKey = dateToMonthKey(transaction.date);
	const currentVersion = versionsByMonthKey.get(monthKey);

	if (currentVersion === undefined) {
		return undefined;
	}

	versionsByMonthKey = new Map(versionsByMonthKey);
	versionsByMonthKey.set(monthKey, currentVersion + 1);
	return versionsByMonthKey;
}
