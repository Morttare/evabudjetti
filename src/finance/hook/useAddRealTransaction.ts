import { useCallback } from 'react';
import type { Persisted, RealTransaction } from '@/src/dataModel';
import {
	excludePlannedTransactionOccurrence,
	insertRealTransaction,
} from '../query/realTransactionMutations';
import { useBalanceVersioning } from '../versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';

export function useAddRealTransaction() {
	const onBalanceRealTransactionCreated = useBalanceVersioning(
		(state) => state.onRealTransactionCreated,
	);
	const onOccurrenceRealTransactionCreated =
		useTransactionOccurrenceVersioning(
			(state) => state.onRealTransactionCreated,
		);
	const onPlannedOccurrenceChanged = useTransactionOccurrenceVersioning(
		(state) => state.onPlannedOccurrenceChanged,
	);

	const addRealTransaction = useCallback(
		async (
			transaction: RealTransaction,
		): Promise<Persisted<RealTransaction>> => {
			const insertedTransaction =
				await insertRealTransaction(transaction);
			// A linked real transaction replaces one scheduled occurrence, not its recurring definition.
			if (
				insertedTransaction.plannedTransactionId != null &&
				insertedTransaction.plannedOccurrenceDate != null
			) {
				await excludePlannedTransactionOccurrence(
					insertedTransaction.plannedTransactionId,
					insertedTransaction.plannedOccurrenceDate,
				);
				onPlannedOccurrenceChanged(
					insertedTransaction.plannedOccurrenceDate,
				);
			}

			onBalanceRealTransactionCreated(insertedTransaction);
			onOccurrenceRealTransactionCreated(insertedTransaction);

			return insertedTransaction;
		},
		[
			onBalanceRealTransactionCreated,
			onOccurrenceRealTransactionCreated,
			onPlannedOccurrenceChanged,
		],
	);

	return addRealTransaction;
}
