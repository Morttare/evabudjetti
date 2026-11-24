import type { RealTransaction } from '@/src/dataModel';

type BalanceAffectingTransaction = Pick<
	RealTransaction,
	'accountId' | 'amount' | 'date' | 'type'
>;

export function getAffectedAccountIds(
	previousTransactions: readonly BalanceAffectingTransaction[],
	nextTransactions: readonly BalanceAffectingTransaction[],
): number[] {
	return Array.from(
		new Set([
			...previousTransactions.map((transaction) => transaction.accountId),
			...nextTransactions.map((transaction) => transaction.accountId),
		]),
	);
}

export function getFirstAffectedDate(
	transactions: readonly BalanceAffectingTransaction[],
): Date | undefined {
	if (transactions.length === 0) {
		return undefined;
	}

	const earliest = new Date(
		Math.min(
			...transactions.map((transaction) => transaction.date.getTime()),
		),
	);
	earliest.setHours(0, 0, 0, 0);
	return earliest;
}

export function getBalanceReconciliationDeltaCents(
	accountId: number,
	reconciliationDate: Date,
	previousTransactions: readonly BalanceAffectingTransaction[],
	nextTransactions: readonly BalanceAffectingTransaction[],
): number {
	const previousAmount = previousTransactions.reduce(
		(total, transaction) =>
			transaction.accountId === accountId &&
			isSameOrBeforeDay(transaction.date, reconciliationDate)
				? total + getSignedAmountCents(transaction)
				: total,
		0,
	);
	const nextAmount = nextTransactions.reduce(
		(total, transaction) =>
			transaction.accountId === accountId &&
			isSameOrBeforeDay(transaction.date, reconciliationDate)
				? total + getSignedAmountCents(transaction)
				: total,
		0,
	);

	return nextAmount - previousAmount;
}

function isSameOrBeforeDay(left: Date, right: Date): boolean {
	const leftDay = new Date(left);
	leftDay.setHours(0, 0, 0, 0);
	const rightDay = new Date(right);
	rightDay.setHours(0, 0, 0, 0);
	return leftDay <= rightDay;
}

function getSignedAmountCents(
	transaction: BalanceAffectingTransaction,
): number {
	const cents = Math.round(transaction.amount * 100);
	return transaction.type === 'income' ? cents : -cents;
}
