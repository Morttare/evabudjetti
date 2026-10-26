import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import type { Persisted, RealTransaction } from '@/src/dataModel';
import { db } from '@/src/db/client';
import * as schema from '@/src/db/schema';
import {
	BALANCE_CORRECTION_CATEGORY_ID,
	BALANCE_CORRECTION_NAMES,
	mergeBalanceCorrections,
} from '../logic/balanceCorrection';

export async function insertRealTransaction(
	transaction: RealTransaction,
): Promise<Persisted<RealTransaction>> {
	const [insertedRealTransaction] = await db
		.insert(schema.realTransactions)
		.values({
			...transaction,
			plannedTransactionId: transaction.plannedTransactionId ?? null,
			plannedOccurrenceDate: transaction.plannedOccurrenceDate ?? null,
		})
		.returning();

	return insertedRealTransaction;
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
	const [updated] = await db
		.update(schema.realTransactions)
		.set({
			name: transaction.name,
			amount: transaction.amount,
			date: transaction.date,
			type: transaction.type,
			categoryId: transaction.categoryId,
			plannedTransactionId: transaction.plannedTransactionId ?? null,
			plannedOccurrenceDate: transaction.plannedOccurrenceDate ?? null,
		})
		.where(eq(schema.realTransactions.id, transaction.id))
		.returning();

	return updated;
}

export async function deleteRealTransaction(id: number): Promise<void> {
	await db
		.delete(schema.realTransactions)
		.where(eq(schema.realTransactions.id, id));
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
