import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import type { Persisted, RealTransaction } from '@/src/dataModel';
import { db } from '@/src/db/client';
import * as schema from '@/src/db/schema';
import {
	BALANCE_CORRECTION_CATEGORY_ID,
	BALANCE_CORRECTION_NAMES,
	mergeBalanceCorrections,
} from '../logic/balanceCorrection';
import { getBalanceReconciliationDeltaCents } from '../logic/balanceReconciliationAdjustment';

export async function insertRealTransaction(
	transaction: RealTransaction,
): Promise<Persisted<RealTransaction>> {
	return db.transaction(async (tx) => {
		const [insertedRealTransaction] = await tx
			.insert(schema.realTransactions)
			.values({
				...transaction,
				plannedTransactionId: transaction.plannedTransactionId ?? null,
				plannedOccurrenceDate:
					transaction.plannedOccurrenceDate ?? null,
			})
			.returning();

		await adjustBalanceReconciliations(tx, [], [insertedRealTransaction]);
		return insertedRealTransaction;
	});
}

export async function upsertDailyBalanceCorrection(
	correction: RealTransaction,
): Promise<{
	created?: Persisted<RealTransaction>;
	updated?: {
		old: Persisted<RealTransaction>;
		updated: Persisted<RealTransaction>;
	};
	deleted: Persisted<RealTransaction>[];
}> {
	const startOfDay = new Date(correction.date);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(correction.date);
	endOfDay.setHours(23, 59, 59, 999);

	return db.transaction(async (tx) => {
		// Merge legacy same-day correction rows as well as the current one.
		const existing = await tx
			.select()
			.from(schema.realTransactions)
			.where(
				and(
					eq(schema.realTransactions.accountId, correction.accountId),
					eq(
						schema.realTransactions.categoryId,
						BALANCE_CORRECTION_CATEGORY_ID,
					),
					inArray(schema.realTransactions.name, [
						...BALANCE_CORRECTION_NAMES,
					]),
					isNull(schema.realTransactions.plannedTransactionId),
					gte(schema.realTransactions.date, startOfDay),
					lte(schema.realTransactions.date, endOfDay),
				),
			)
			.orderBy(schema.realTransactions.date);

		const merged = mergeBalanceCorrections(existing, correction);

		if (merged === undefined) {
			if (existing.length > 0) {
				await adjustBalanceReconciliations(tx, existing, []);
				await tx.delete(schema.realTransactions).where(
					inArray(
						schema.realTransactions.id,
						existing.map((transaction) => transaction.id),
					),
				);
			}
			return { deleted: existing };
		}

		if (existing.length === 0) {
			const [created] = await tx
				.insert(schema.realTransactions)
				.values(merged)
				.returning();
			await adjustBalanceReconciliations(tx, [], [created]);
			return { created, deleted: [] };
		}

		const [updated] = await tx
			.update(schema.realTransactions)
			.set({
				name: merged.name,
				amount: merged.amount,
				date: merged.date,
				type: merged.type,
			})
			.where(eq(schema.realTransactions.id, existing[0].id))
			.returning();
		const deleted = existing.slice(1);

		await adjustBalanceReconciliations(tx, existing, [updated]);

		if (deleted.length > 0) {
			await tx.delete(schema.realTransactions).where(
				inArray(
					schema.realTransactions.id,
					deleted.map((transaction) => transaction.id),
				),
			);
		}

		return { updated: { old: existing[0], updated }, deleted };
	});
}

export async function updateRealTransaction(
	transaction: Persisted<RealTransaction>,
): Promise<Persisted<RealTransaction>> {
	return db.transaction(async (tx) => {
		const [previous] = await tx
			.select()
			.from(schema.realTransactions)
			.where(eq(schema.realTransactions.id, transaction.id));
		if (previous === undefined) {
			throw new Error(
				`Cannot update missing real transaction ${transaction.id}`,
			);
		}

		const [updated] = await tx
			.update(schema.realTransactions)
			.set({
				name: transaction.name,
				amount: transaction.amount,
				date: transaction.date,
				type: transaction.type,
				categoryId: transaction.categoryId,
				plannedTransactionId: transaction.plannedTransactionId ?? null,
				plannedOccurrenceDate:
					transaction.plannedOccurrenceDate ?? null,
			})
			.where(eq(schema.realTransactions.id, transaction.id))
			.returning();

		await adjustBalanceReconciliations(tx, [previous], [updated]);
		return updated;
	});
}

export async function deleteRealTransaction(
	transaction: Persisted<RealTransaction>,
): Promise<void> {
	await db.transaction(async (tx) => {
		const [previous] = await tx
			.select()
			.from(schema.realTransactions)
			.where(eq(schema.realTransactions.id, transaction.id));
		if (previous === undefined) {
			return;
		}

		await adjustBalanceReconciliations(tx, [previous], []);
		await tx
			.delete(schema.realTransactions)
			.where(eq(schema.realTransactions.id, transaction.id));
	});
}

export async function excludePlannedTransactionOccurrence(
	plannedTransactionId: number,
	occurrenceDate: Date,
): Promise<void> {
	// The unique key makes repeated saves of the same occurrence exclusion harmless.
	await db
		.insert(schema.plannedTransactionOccurrenceExceptions)
		.values({ plannedTransactionId, occurrenceDate })
		.onConflictDoNothing();
}

async function adjustBalanceReconciliations(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	previousTransactions: readonly RealTransaction[],
	nextTransactions: readonly RealTransaction[],
): Promise<void> {
	if (previousTransactions.length === 0 && nextTransactions.length === 0) {
		return;
	}

	const accountIds = new Set([
		...previousTransactions.map((transaction) => transaction.accountId),
		...nextTransactions.map((transaction) => transaction.accountId),
	]);

	for (const accountId of accountIds) {
		const affectedTransactions = [
			...previousTransactions,
			...nextTransactions,
		].filter((transaction) => transaction.accountId === accountId);
		const firstAffectedDate = new Date(
			Math.min(
				...affectedTransactions.map((transaction) =>
					transaction.date.getTime(),
				),
			),
		);
		// Reconciliations are absolute anchors, so carry historical event changes into each later anchor.
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
