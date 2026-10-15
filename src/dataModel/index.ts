export const DEFAULT_BUDGET_ID = 0;
export const DEFAULT_ACCOUNT_ID = 0;

export type RecurrenceBase = 'day' | 'week' | 'month' | 'year';

export type TransactionType = 'income' | 'expense';

/**
 * Represents an object that has been persisted to the database.
 */
export type Persisted<T> = T & { id: number };

/**
 * Represents a financial budget, which can contain multiple accounts and transactions.
 *
 * This is not yet supported in the current version of the app, but it implemented into the data model to allow for future expansion where users can manage multiple budgets.
 */
export interface Budget {
	name: string;
}

/**
 * Represents a financial account within a budget, which can have multiple transactions and balance reconciliations.
 *
 * This is not yet supported in the current version of the app, but it implemented into the data model to allow for future expansion where users can manage multiple accounts within a budget.
 */
export interface Account {
	budgetId: number;
	name: string;
}

/**
 * A record of an account's balance at a specific date.
 * Used to update the estimated account balance based on the real balance.
 */
export interface BalanceReconciliation {
	accountId: number;
	date: Date;
	amount: number;
}

/**
 * A category for transactions, which can be used to group and analyze transactions by type.
 */
export interface Category {
	name: string;
	type: TransactionType;
	color?: string;
	icon?: string;
}

/**
 * A budgeted transaction that can be planned to recur over time.
 * This is the main data structure for the app, as it allows users to create transactions that will automatically generate occurrences in the future based on their recurrence settings.
 */
export interface PlannedTransaction {
	accountId: number;
	name: string;
	categoryId: number;
	amount: number;
	startDate: Date;
	endDate: Date | null;
	type: TransactionType;
	recurrenceBase: RecurrenceBase | null;
	recurrenceInterval: number;
}

/**
 * A real transaction that has occurred,
 * either used to update an occurrence generated from a planned transaction or created independently by the user.
 */
export interface RealTransaction {
	accountId: number;
	name: string;
	categoryId: number;
	amount: number;
	date: Date;
	type: TransactionType;
	plannedTransactionId: number | null;
	/** Original scheduled date; differs from date when this occurrence is moved. */
	plannedOccurrenceDate?: Date | null;
}

/** A skipped scheduled date for one planned transaction, leaving its recurrence intact. */
export interface PlannedTransactionOccurrenceException {
	plannedTransactionId: number;
	occurrenceDate: Date;
}

/**
 * A computed transaction occurrence that is either generated from a planned transaction based on its recurrence settings
 * or created from a real transaction.
 */
export interface TransactionOccurrence {
	name: string;
	categoryId: number;
	amount: number;
	date: Date;
	type: TransactionType;
	realTransaction?: Persisted<RealTransaction>;
	plannedTransaction?: Persisted<PlannedTransaction>;
}

export interface MonthInstance {
	/**
	 * The year of the month, e.g. 2026
	 */
	year: number;
	/**
	 * The month number, 0-11 where 0 is January and 11 is December
	 */
	month: number;
}

export interface TransactionOccurrencesMonthData {
	/**
	 * A stable key representing the month, e.g. "2026-12", also used as the key in the cache map
	 */
	monthKey: string;
	/**
	 * All transaction occurrences that happen in this month, including both planned and real transactions,
	 * sorted by date
	 */
	transactionOccurrences: TransactionOccurrence[];
}

export interface DayBalance {
	/** The balance at the end of the day */
	balance: number;
	/** Whether this balance is directly from the reconciliations, i.e. the user has manually input it for this day */
	isReconciled: boolean;
}

export interface AccountBalanceMonthData {
	/** A stable key representing the month, e.g. "2026-12", also used as the key in the cache map */
	monthKey: string;
	/** The balance of the account at the start of this month, if available */
	startBalance?: number;
	/** The balance of the account at the end of this month, if available */
	endBalance?: number;
	/** Daily balances for the month */
	dailyBalances: (DayBalance | undefined)[];
}

export interface OccurrencesAndBalanceMonthData {
	/** A stable key representing the month, e.g. "2026-12", also used as the key in the cache map */
	monthKey: string;
	/** The balance of the account at the start of this month, if available */
	startBalance?: number;
	/** The balance of the account at the end of this month, if available */
	endBalance?: number;
	/** Daily balances for the month */
	dailyBalances: (DayBalance | undefined)[];
	/** All transaction occurrences that happen in this month, including both planned and real transactions,
	 * sorted by date
	 */
	transactionOccurrences: TransactionOccurrence[];
}

export interface CategoryTransactionSummary {
	/** The id of the category for which this summary is */
	categoryId: number;
	/** The total sum of transactions for the category in the month */
	totalAmount: number;
	/** The transaction occurrences for the category in the month */
	transactionOccurrences: TransactionOccurrence[];
}

export interface TransactionSummaryMonthData {
	/** A stable key representing the month, e.g. "2026-12", also used as the key in the cache map */
	monthKey: string;
	/** Total amount of all income transactions that occur in this month */
	totalIncome: number;
	/** Total amount of all expense transactions that occur in this month */
	totalExpense: number;
	/** Cash flow for the month, negative or positive */
	cashFlow: number;
	/** Incomes by category id */
	incomeByCategory: Map<number, CategoryTransactionSummary>;
	/** Expenses by category id */
	expenseByCategory: Map<number, CategoryTransactionSummary>;
}
