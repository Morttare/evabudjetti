import { useCallback } from 'react';
import { useBalanceVersioning } from '../versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../versioning/transactionOccurrenceVersioning';

// Invalidates tracked balance and transaction occurrence caches.
export function useInvalidateFinanceCaches(): () => void {
	const invalidateBalanceMonths = useBalanceVersioning(
		(state) => state.invalidateTrackedMonths,
	);
	const invalidateOccurrenceMonths = useTransactionOccurrenceVersioning(
		(state) => state.invalidateTrackedMonths,
	);

	return useCallback(() => {
		invalidateBalanceMonths();
		invalidateOccurrenceMonths();
	}, [invalidateBalanceMonths, invalidateOccurrenceMonths]);
}
