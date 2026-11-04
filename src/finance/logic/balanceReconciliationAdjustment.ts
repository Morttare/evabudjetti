import type { RealTransaction } from '@/src/dataModel';

type BalanceAffectingTransaction = Pick<
	RealTransaction,
	'accountId' | 'amount' | 'date' | 'type'
>;

export function getBalanceReconciliationDeltaCents(
	accountId: number,
	reconciliationDate: Date,
	previousTransactions: readonly BalanceAffectingTransaction[],
	nextTransactions: readonly BalanceAffectingTransaction[],
): number {
	const previousAmount = previousTransactions.reduce(
		(total, transaction) =>
			transaction.accountId === accountId &&
			transaction.date <= reconciliationDate
				? total + getSignedAmountCents(transaction)
				: total,
		0,
	);
	const nextAmount = nextTransactions.reduce(
		(total, transaction) =>
			transaction.accountId === accountId &&
			transaction.date <= reconciliationDate
				? total + getSignedAmountCents(transaction)
				: total,
		0,
	);

	return nextAmount - previousAmount;
}

function getSignedAmountCents(
	transaction: BalanceAffectingTransaction,
): number {
	const cents = Math.round(transaction.amount * 100);
	return transaction.type === 'income' ? cents : -cents;
}
