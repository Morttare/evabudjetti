import { and, eq, gte, lte } from 'drizzle-orm';
import type { RealTransaction } from '@/src/dataModel';
import { DEFAULT_ACCOUNT_ID } from '@/src/dataModel';
import { db, isDbReal } from '@/src/db/client';
import * as schema from '@/src/db/schema';
import useBalanceReconciliationStore from '@/src/store/useBalanceReconciliationStore';
import {
	getAffectedAccountIds,
	getBalanceReconciliationDeltaCents,
	getFirstAffectedDate,
} from '../logic/balanceReconciliationAdjustment';

type BalanceReconciliationTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

/**
 * Propagates real-transaction changes to reconciliations that occur on or after
 * the earliest affected transaction date.
 */
export async function adjustBalanceReconciliations(
	tx: BalanceReconciliationTransaction,
	previousTransactions: readonly RealTransaction[],
	nextTransactions: readonly RealTransaction[],
): Promise<void> {
	if (previousTransactions.length === 0 && nextTransactions.length === 0) {
		return;
	}

	const affectedTransactions = [...previousTransactions, ...nextTransactions];

	for (const accountId of getAffectedAccountIds(
		previousTransactions,
		nextTransactions,
	)) {
		const accountTransactions = affectedTransactions.filter(
			(transaction) => transaction.accountId === accountId,
		);
		const firstAffectedDate = getFirstAffectedDate(accountTransactions);
		if (firstAffectedDate === undefined) {
			continue;
		}

		const reconciliations = await tx
			.select()
			.from(schema.balanceReconciliations)
			.where(
				and(
					eq(schema.balanceReconciliations.accountId, accountId),
					gte(schema.balanceReconciliations.date, firstAffectedDate),
				),
			);

		for (const reconciliation of reconciliations) {
			const deltaCents = getBalanceReconciliationDeltaCents(
				accountId,
				reconciliation.date,
				previousTransactions,
				nextTransactions,
			);
			if (deltaCents === 0) {
				continue;
			}

			await tx
				.update(schema.balanceReconciliations)
				.set({
					amount:
						(Math.round(reconciliation.amount * 100) + deltaCents) /
						100,
				})
				.where(eq(schema.balanceReconciliations.id, reconciliation.id));
		}
	}
}

export async function insertBalanceReconciliation(
	amount: number,
	date: Date = new Date(),
) {
	if (!isDbReal) {
		return useBalanceReconciliationStore
			.getState()
			.upsertForDay(amount, date, DEFAULT_ACCOUNT_ID);
	}

	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(date);
	endOfDay.setHours(23, 59, 59, 999);
	const existingRecord = await db.query.balanceReconciliations.findFirst({
		where: and(
			eq(schema.balanceReconciliations.accountId, DEFAULT_ACCOUNT_ID),
			gte(schema.balanceReconciliations.date, startOfDay),
			lte(schema.balanceReconciliations.date, endOfDay),
		),
	});
	if (existingRecord) {
		const [updatedReconciliation] = await db
			.update(schema.balanceReconciliations)
			.set({
				amount: amount,
				date: date,
			})
			.where(eq(schema.balanceReconciliations.id, existingRecord.id))
			.returning();

		return updatedReconciliation;
	} else {
		const [insertedReconciliation] = await db
			.insert(schema.balanceReconciliations)
			.values({
				accountId: DEFAULT_ACCOUNT_ID,
				amount: amount,
				date: date,
			})
			.returning();

		return insertedReconciliation;
	}
}
