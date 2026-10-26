import { useCallback } from 'react';
import type { RealTransaction } from '@/src/dataModel';
import { upsertDailyBalanceCorrection } from '../query/realTransactionMutations';
import { useBalanceVersioning } from '../versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';

export function useUpsertDailyBalanceCorrection() {
	const onBalanceTransactionCreated = useBalanceVersioning(
		(state) => state.onRealTransactionCreated,
	);
	const onBalanceTransactionUpdated = useBalanceVersioning(
		(state) => state.onRealTransactionUpdated,
	);
	const onBalanceTransactionDeleted = useBalanceVersioning(
		(state) => state.onRealTransactionDeleted,
	);
	const onOccurrenceTransactionCreated = useTransactionOccurrenceVersioning(
		(state) => state.onRealTransactionCreated,
	);
	const onOccurrenceTransactionUpdated = useTransactionOccurrenceVersioning(
		(state) => state.onRealTransactionUpdated,
	);
	const onOccurrenceTransactionDeleted = useTransactionOccurrenceVersioning(
		(state) => state.onRealTransactionDeleted,
	);

	return useCallback(
		async (correction: RealTransaction) => {
			const result = await upsertDailyBalanceCorrection(correction);

			// Keep balance and transaction occurrence caches in sync with the mutation.
			if (result.created) {
				onBalanceTransactionCreated(result.created);
				onOccurrenceTransactionCreated(result.created);
			}
			if (result.updated) {
				onBalanceTransactionUpdated(
					result.updated.old,
					result.updated.updated,
				);
				onOccurrenceTransactionUpdated(
					result.updated.old,
					result.updated.updated,
				);
			}
			for (const deleted of result.deleted) {
				onBalanceTransactionDeleted(deleted);
				onOccurrenceTransactionDeleted(deleted);
			}
		},
		[
			onBalanceTransactionCreated,
			onBalanceTransactionUpdated,
			onBalanceTransactionDeleted,
			onOccurrenceTransactionCreated,
			onOccurrenceTransactionUpdated,
			onOccurrenceTransactionDeleted,
		],
	);
}
