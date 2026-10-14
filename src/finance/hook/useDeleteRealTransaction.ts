import { useCallback } from 'react';
import type { Persisted, RealTransaction } from '@/src/dataModel';
import {
	deleteRealTransaction as deleteRealTransactionFromDb,
	excludePlannedTransactionOccurrence,
} from '../query/realTransactionMutations';
import { useBalanceVersioning } from '../versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';

export function useDeleteRealTransaction() {
	const onBalanceRealTransactionDeleted = useBalanceVersioning(
		(state) => state.onRealTransactionDeleted,
	);
	const onOccurrenceRealTransactionDeleted =
		useTransactionOccurrenceVersioning(
			(state) => state.onRealTransactionDeleted,
		);
	const onPlannedOccurrenceChanged = useTransactionOccurrenceVersioning(
		(state) => state.onPlannedOccurrenceChanged,
	);

	return useCallback(
		async (transaction: Persisted<RealTransaction>): Promise<void> => {
			const plannedOccurrenceDate =
				transaction.plannedOccurrenceDate ?? transaction.date;
			// Save the skip before deleting the linked row, or its planned occurrence would return.
			if (transaction.plannedTransactionId != null) {
				await excludePlannedTransactionOccurrence(
					transaction.plannedTransactionId,
					plannedOccurrenceDate,
				);
			}
			await deleteRealTransactionFromDb(transaction.id);

			// Normalize date: Drizzle expo-sqlite stores timestamps as seconds,
			// so reconstruct a proper Date if needed.
			const date =
				transaction.date instanceof Date
					? transaction.date
					: new Date(transaction.date as unknown as number);

			const deleted: RealTransaction = {
				accountId: transaction.accountId,
				name: transaction.name,
				categoryId: transaction.categoryId,
				amount: transaction.amount,
				date,
				type: transaction.type,
				plannedTransactionId: transaction.plannedTransactionId ?? null,
				plannedOccurrenceDate:
					transaction.plannedOccurrenceDate ?? null,
			};

			onBalanceRealTransactionDeleted(deleted);
			onOccurrenceRealTransactionDeleted(deleted);
			if (deleted.plannedTransactionId != null) {
				onPlannedOccurrenceChanged(plannedOccurrenceDate);
			}
		},
		[
			onBalanceRealTransactionDeleted,
			onOccurrenceRealTransactionDeleted,
			onPlannedOccurrenceChanged,
		],
	);
}
