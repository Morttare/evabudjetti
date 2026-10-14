import { useCallback } from 'react';
import type { Persisted, RealTransaction } from '@/src/dataModel';
import {
	excludePlannedTransactionOccurrence,
	updateRealTransaction,
} from '../query/realTransactionMutations';
import { useBalanceVersioning } from '../versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';

export function useUpdateRealTransaction() {
	const onBalanceRealTransactionUpdated = useBalanceVersioning(
		(state) => state.onRealTransactionUpdated,
	);
	const onOccurrenceRealTransactionUpdated =
		useTransactionOccurrenceVersioning(
			(state) => state.onRealTransactionUpdated,
		);
	const onPlannedOccurrenceChanged = useTransactionOccurrenceVersioning(
		(state) => state.onPlannedOccurrenceChanged,
	);

	return useCallback(
		async (
			old: Persisted<RealTransaction>,
			updated: Persisted<RealTransaction>,
		): Promise<Persisted<RealTransaction>> => {
			// Retain the source date while the real transaction's date changes.
			const plannedOccurrenceDate =
				updated.plannedTransactionId == null
					? null
					: (updated.plannedOccurrenceDate ??
						old.plannedOccurrenceDate ??
						old.date);
			const result = await updateRealTransaction({
				...updated,
				plannedOccurrenceDate,
			});
			if (
				result.plannedTransactionId != null &&
				result.plannedOccurrenceDate != null
			) {
				await excludePlannedTransactionOccurrence(
					result.plannedTransactionId,
					result.plannedOccurrenceDate,
				);
				onPlannedOccurrenceChanged(result.plannedOccurrenceDate);
			}

			onBalanceRealTransactionUpdated(old, result);
			onOccurrenceRealTransactionUpdated(old, result);

			return result;
		},
		[
			onBalanceRealTransactionUpdated,
			onOccurrenceRealTransactionUpdated,
			onPlannedOccurrenceChanged,
		],
	);
}
