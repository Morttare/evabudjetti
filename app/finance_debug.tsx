/**
 * AI-GENERATED DEBUG SCREEN
 */

import { and, eq, gte, lt } from 'drizzle-orm';
import { Stack } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FlatList,
	type LayoutChangeEvent,
	Platform,
	TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Separator, SizableText, Text, XStack, YStack } from 'tamagui';
import { LOCALE } from '@/src/constants';
import type {
	BalanceReconciliation,
	OccurrencesAndBalanceMonthData,
	PlannedTransaction,
	RealTransaction,
	TransactionOccurrence,
	TransactionType,
} from '@/src/dataModel';
import { db, isDbReal } from '@/src/db/client';
import * as schema from '@/src/db/schema';
import { useOccurrencesAndBalances } from '@/src/finance/hook/useOccurrencesAndBalances';
import { createMonthKey, decodeMonthKey } from '@/src/finance/logic/util';
import { useBalanceVersioning } from '@/src/finance/versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '@/src/finance/versioning/transactionOccurrenceVersioning';
import { formatCurrency } from '@/src/utils/budgetUtils';

interface DayGroup {
	day: number;
	transactions: TransactionOccurrence[];
}

const DATE_INPUT_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const INITIAL_MIN_MONTHS = 2;
const INITIAL_MAX_MONTHS = 6;
const LOAD_CHUNK_SIZE = 2;
const AUTO_FILL_HEIGHT_EPSILON = 8;
const MAX_AUTO_FILL_MONTHS = 72;
const DEBUG_BUDGET_NAME = 'Finance Debug Budget';
const DEBUG_ACCOUNT_NAME = 'Finance Debug Account';
const DEBUG_INCOME_CATEGORY_NAME = 'Finance Debug Income';
const DEBUG_EXPENSE_CATEGORY_NAME = 'Finance Debug Expense';
const INPUT_FONT_FAMILY = Platform.select({
	ios: 'System',
	android: 'sans-serif',
	default: 'sans-serif',
});

type ActionMessageTone = 'info' | 'success' | 'error';

interface DebugDbReferences {
	accountId: number;
	incomeCategoryId: number;
	expenseCategoryId: number;
}

function normalizeToMonthStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	return `${year}-${month}`;
}

function parseDateInput(value: string): Date | undefined {
	const match = DATE_INPUT_REGEX.exec(value.trim());
	if (match == null) {
		return undefined;
	}

	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);

	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		return undefined;
	}

	if (month < 0 || month > 11 || day < 1 || day > 31) {
		return undefined;
	}

	const parsed = new Date(year, month, day);
	if (
		parsed.getFullYear() !== year ||
		parsed.getMonth() !== month ||
		parsed.getDate() !== day
	) {
		return undefined;
	}

	return parsed;
}

function parseAmountInput(value: string): number | undefined {
	const normalized = value.trim().replace(',', '.');
	if (normalized.length === 0) {
		return undefined;
	}

	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) {
		return undefined;
	}

	return parsed;
}

function getDayBounds(date: Date): { start: Date; endExclusive: Date } {
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const endExclusive = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate() + 1,
	);

	return { start, endExclusive };
}

function toDate(value: Date | string): Date {
	if (value instanceof Date) {
		return value;
	}

	return new Date(value);
}

function formatMonthTitle(year: number, month: number): string {
	return new Intl.DateTimeFormat(LOCALE, {
		year: 'numeric',
		month: 'long',
	}).format(new Date(year, month, 1));
}

function formatDayTitle(year: number, month: number, day: number): string {
	return new Intl.DateTimeFormat(LOCALE).format(new Date(year, month, day));
}

function groupByDay(transactions: TransactionOccurrence[]): DayGroup[] {
	const byDay = new Map<number, TransactionOccurrence[]>();

	const sortedTransactions = [...transactions]
		.map((transaction) => ({
			...transaction,
			date: toDate(transaction.date),
		}))
		.sort((left, right) => left.date.getTime() - right.date.getTime());

	for (const transaction of sortedTransactions) {
		const day = transaction.date.getDate();
		const existingDay = byDay.get(day);
		if (existingDay == null) {
			byDay.set(day, [transaction]);
			continue;
		}

		existingDay.push(transaction);
	}

	return [...byDay.entries()]
		.sort(([leftDay], [rightDay]) => leftDay - rightDay)
		.map(([day, dayTransactions]) => ({
			day,
			transactions: dayTransactions,
		}));
}

const FinanceDebugMonthItem = memo(function FinanceDebugMonthItem({
	item,
}: {
	item: OccurrencesAndBalanceMonthData;
}) {
	const { year, month } = useMemo(
		() => decodeMonthKey(item.monthKey),
		[item.monthKey],
	);
	const dayGroups = useMemo(
		() => groupByDay(item.transactionOccurrences),
		[item.transactionOccurrences],
	);
	const reconciledDays = useMemo(
		() =>
			item.dailyBalances
				.map((dayBalance, index) => {
					if (dayBalance == null || !dayBalance.isReconciled) {
						return undefined;
					}

					return {
						day: index + 1,
						balance: dayBalance.balance,
					};
				})
				.filter(
					(entry): entry is { day: number; balance: number } =>
						entry !== undefined,
				),
		[item.dailyBalances],
	);

	return (
		<YStack paddingVertical={'$3'} gap={'$2'}>
			<SizableText size={'$title3'} fontWeight={'700'}>
				{formatMonthTitle(year, month)}
			</SizableText>
			<Text fontSize={'$2'} color={'$black'}>
				Month start balance:{' '}
				{item.startBalance !== undefined
					? formatCurrency(item.startBalance)
					: 'Not available'}
			</Text>
			<Text fontSize={'$2'} color={'$black'}>
				Month end balance:{' '}
				{item.endBalance !== undefined
					? formatCurrency(item.endBalance)
					: 'Not available'}
			</Text>

			<YStack
				gap={'$1'}
				padding={'$2'}
				borderWidth={1}
				borderColor={'#cde8da'}
				borderRadius={8}
				backgroundColor={'#edf8f0'}
			>
				<SizableText size={'$2'} fontWeight={'700'}>
					Reconciliations
				</SizableText>
				{reconciledDays.length === 0 ? (
					<Text fontSize={'$2'} color={'$black'}>
						No reconciliations in this month.
					</Text>
				) : (
					<YStack gap={'$1'}>
						{reconciledDays.map((reconciliationDay) => (
							<XStack
								key={`${item.monthKey}-reconciliation-${reconciliationDay.day}`}
								justifyContent={'space-between'}
								alignItems={'center'}
							>
								<Text fontSize={'$2'} color={'$black'}>
									{formatDayTitle(
										year,
										month,
										reconciliationDay.day,
									)}
								</Text>
								<Text fontSize={'$2'} fontWeight={'700'}>
									{formatCurrency(reconciliationDay.balance)}
								</Text>
							</XStack>
						))}
					</YStack>
				)}
			</YStack>

			{dayGroups.length === 0 ? (
				<Text fontSize={'$2'} color={'$black'}>
					No transactions in this month.
				</Text>
			) : (
				<YStack gap={'$2'}>
					{dayGroups.map((group) => {
						const dayEndBalanceData =
							item.dailyBalances[group.day - 1];

						return (
							<YStack
								key={`${item.monthKey}-${group.day}`}
								gap={'$1'}
								padding={'$2'}
								borderWidth={1}
								borderColor={'#e2e6ea'}
								borderRadius={8}
							>
								<SizableText size={'$2'} fontWeight={'700'}>
									{formatDayTitle(year, month, group.day)}
								</SizableText>

								{group.transactions.map((transaction) => {
									const rawAmount = Number(
										transaction.amount,
									);
									const safeAmount = Number.isFinite(
										rawAmount,
									)
										? rawAmount
										: 0;
									const signedAmount =
										transaction.type === 'income'
											? Math.abs(safeAmount)
											: -Math.abs(safeAmount);
									const transactionDate = toDate(
										transaction.date,
									);
									const transactionIdentity =
										transaction.realTransaction?.id ??
										transaction.plannedTransaction?.id ??
										`${transaction.type}-${transaction.name}-${Math.abs(safeAmount)}`;

									return (
										<XStack
											key={`${item.monthKey}-${group.day}-${transactionDate.getTime()}-${transactionIdentity}`}
											justifyContent={'space-between'}
											alignItems={'center'}
										>
											<Text flex={1} fontSize={'$2'}>
												{transaction.name}
											</Text>
											<Text
												fontSize={'$2'}
												color={'$black'}
											>
												{transaction.type}
											</Text>
											<Text
												fontSize={'$2'}
												fontWeight={'600'}
												width={120}
												textAlign={'right'}
											>
												{formatCurrency(signedAmount)}
											</Text>
										</XStack>
									);
								})}

								<Separator marginVertical={'$1'} />
								<XStack
									justifyContent={'space-between'}
									alignItems={'center'}
								>
									<Text fontSize={'$2'} fontWeight={'700'}>
										Day end balance
									</Text>
									<Text fontSize={'$2'} fontWeight={'700'}>
										{dayEndBalanceData !== undefined
											? formatCurrency(
													dayEndBalanceData.balance,
												)
											: 'Not available'}
									</Text>
								</XStack>
								{dayEndBalanceData?.isReconciled ? (
									<Text fontSize={'$2'} color={'#1d6f42'}>
										Balance reconciled for this day.
									</Text>
								) : null}
							</YStack>
						);
					})}
				</YStack>
			)}
		</YStack>
	);
});

export default function FinanceDebugScreen() {
	const initialStartDate = useMemo(() => new Date(), []);
	const [startDateInput, setStartDateInput] = useState(
		formatDateInput(initialStartDate),
	);
	const [inputError, setInputError] = useState<string | null>(null);
	const [reconciliationDateInput, setReconciliationDateInput] = useState(
		formatDateInput(initialStartDate),
	);
	const [reconciliationAmountInput, setReconciliationAmountInput] =
		useState('0');
	const [realTransactionDateInput, setRealTransactionDateInput] = useState(
		formatDateInput(initialStartDate),
	);
	const [realTransactionAmountInput, setRealTransactionAmountInput] =
		useState('0');
	const [actionMessage, setActionMessage] = useState<string | null>(
		isDbReal ? null : 'Database debug actions are disabled on web builds.',
	);
	const [actionMessageTone, setActionMessageTone] =
		useState<ActionMessageTone>('info');
	const [isAddingReconciliation, setIsAddingReconciliation] = useState(false);
	const [isAddingSamplePlannedSet, setIsAddingSamplePlannedSet] =
		useState(false);
	const [isClearingDb, setIsClearingDb] = useState(false);
	const [isAddingRealTransaction, setIsAddingRealTransaction] =
		useState(false);
	const [isDeletingRealTransactions, setIsDeletingRealTransactions] =
		useState(false);

	const normalizedInitialStartDate = useMemo(
		() => normalizeToMonthStart(initialStartDate),
		[initialStartDate],
	);
	const [normalizedStartDate, setNormalizedStartDate] = useState(
		normalizedInitialStartDate,
	);
	const [monthCountFromStart, setMonthCountFromStart] =
		useState(INITIAL_MIN_MONTHS);
	const [listViewportHeight, setListViewportHeight] = useState(0);
	const [listContentHeight, setListContentHeight] = useState(0);
	const endReachedDuringMomentum = useRef(true);

	const endDate = useMemo(
		() =>
			new Date(
				normalizedStartDate.getFullYear(),
				normalizedStartDate.getMonth() + monthCountFromStart - 1,
				1,
			),
		[normalizedStartDate, monthCountFromStart],
	);

	const startYear = normalizedStartDate.getFullYear();
	const startMonth = normalizedStartDate.getMonth();
	const endYear = endDate.getFullYear();
	const endMonth = endDate.getMonth();

	const monthItems = useOccurrencesAndBalances(
		startYear,
		startMonth,
		endYear,
		endMonth,
	);

	const renderMonthItem = useCallback(
		({ item }: { item: OccurrencesAndBalanceMonthData }) => (
			<FinanceDebugMonthItem item={item} />
		),
		[],
	);

	const itemSeparator = useCallback(() => <Separator />, []);

	const setActionStatus = useCallback(
		(message: string, tone: ActionMessageTone) => {
			setActionMessage(message);
			setActionMessageTone(tone);
		},
		[],
	);

	const ensureDebugDbReferences =
		useCallback(async (): Promise<DebugDbReferences> => {
			const budgetRows = await db
				.select({ id: schema.budgets.id })
				.from(schema.budgets)
				.limit(1);

			let budgetId = budgetRows[0]?.id;
			if (budgetId == null) {
				const insertedBudgetRows = await db
					.insert(schema.budgets)
					.values({ name: DEBUG_BUDGET_NAME })
					.returning({ id: schema.budgets.id });
				budgetId = insertedBudgetRows[0]?.id;
			}

			if (budgetId == null) {
				throw new Error(
					'Could not resolve a budget for debug inserts.',
				);
			}

			const accountRows = await db
				.select({ id: schema.accounts.id })
				.from(schema.accounts)
				.where(eq(schema.accounts.budgetId, budgetId))
				.limit(1);

			let accountId = accountRows[0]?.id;
			if (accountId == null) {
				const insertedAccountRows = await db
					.insert(schema.accounts)
					.values({
						budgetId,
						name: DEBUG_ACCOUNT_NAME,
					})
					.returning({ id: schema.accounts.id });
				accountId = insertedAccountRows[0]?.id;
			}

			if (accountId == null) {
				throw new Error(
					'Could not resolve an account for debug inserts.',
				);
			}

			const incomeCategoryRows = await db
				.select({ id: schema.categories.id })
				.from(schema.categories)
				.where(eq(schema.categories.type, 'income'))
				.limit(1);

			let incomeCategoryId = incomeCategoryRows[0]?.id;
			if (incomeCategoryId == null) {
				const insertedIncomeCategoryRows = await db
					.insert(schema.categories)
					.values({
						name: DEBUG_INCOME_CATEGORY_NAME,
						type: 'income',
						color: '#3a86ff',
						icon: 'cash',
					})
					.returning({ id: schema.categories.id });
				incomeCategoryId = insertedIncomeCategoryRows[0]?.id;
			}

			if (incomeCategoryId == null) {
				throw new Error(
					'Could not resolve an income category for debug inserts.',
				);
			}

			const expenseCategoryRows = await db
				.select({ id: schema.categories.id })
				.from(schema.categories)
				.where(eq(schema.categories.type, 'expense'))
				.limit(1);

			let expenseCategoryId = expenseCategoryRows[0]?.id;
			if (expenseCategoryId == null) {
				const insertedExpenseCategoryRows = await db
					.insert(schema.categories)
					.values({
						name: DEBUG_EXPENSE_CATEGORY_NAME,
						type: 'expense',
						color: '#ef476f',
						icon: 'wallet',
					})
					.returning({ id: schema.categories.id });
				expenseCategoryId = insertedExpenseCategoryRows[0]?.id;
			}

			if (expenseCategoryId == null) {
				throw new Error(
					'Could not resolve an expense category for debug inserts.',
				);
			}

			return {
				accountId,
				incomeCategoryId,
				expenseCategoryId,
			};
		}, []);

	const handleAddBalanceReconciliation = useCallback(async () => {
		if (!isDbReal) {
			setActionStatus(
				'Database debug actions are disabled on web builds.',
				'info',
			);
			return;
		}

		const parsedDate = parseDateInput(reconciliationDateInput);
		if (parsedDate == null) {
			setActionStatus(
				'Use format YYYY-MM-DD for reconciliation date.',
				'error',
			);
			return;
		}

		const parsedAmount = parseAmountInput(reconciliationAmountInput);
		if (parsedAmount == null) {
			setActionStatus('Enter a valid reconciliation balance.', 'error');
			return;
		}

		setIsAddingReconciliation(true);

		try {
			const references = await ensureDebugDbReferences();
			const createdReconciliation: BalanceReconciliation = {
				accountId: references.accountId,
				date: parsedDate,
				amount: parsedAmount,
			};

			await db
				.insert(schema.balanceReconciliations)
				.values(createdReconciliation);

			useBalanceVersioning
				.getState()
				.onBalanceReconciliationCreated(createdReconciliation);

			setActionStatus(
				`Added reconciliation ${formatDateInput(parsedDate)} = ${formatCurrency(parsedAmount)}.`,
				'success',
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			setActionStatus(
				`Failed to add reconciliation: ${message}`,
				'error',
			);
		} finally {
			setIsAddingReconciliation(false);
		}
	}, [
		ensureDebugDbReferences,
		reconciliationDateInput,
		reconciliationAmountInput,
		setActionStatus,
	]);

	const handleAddSampleRecurringPlannedSet = useCallback(async () => {
		if (!isDbReal) {
			setActionStatus(
				'Database debug actions are disabled on web builds.',
				'info',
			);
			return;
		}

		setIsAddingSamplePlannedSet(true);

		try {
			const references = await ensureDebugDbReferences();
			const baseDate = new Date(
				normalizedStartDate.getFullYear(),
				normalizedStartDate.getMonth(),
				1,
			);

			const samplePlannedTransactions: PlannedTransaction[] = [
				{
					accountId: references.accountId,
					name: 'Debug Salary',
					categoryId: references.incomeCategoryId,
					amount: 3200,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						1,
					),
					endDate: null,
					type: 'income',
					recurrenceBase: 'month',
					recurrenceInterval: 1,
				},
				{
					accountId: references.accountId,
					name: 'Debug Freelance Gig',
					categoryId: references.incomeCategoryId,
					amount: 460,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						5,
					),
					endDate: null,
					type: 'income',
					recurrenceBase: 'week',
					recurrenceInterval: 2,
				},
				{
					accountId: references.accountId,
					name: 'Debug Annual Bonus',
					categoryId: references.incomeCategoryId,
					amount: 1200,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						20,
					),
					endDate: null,
					type: 'income',
					recurrenceBase: 'year',
					recurrenceInterval: 1,
				},
				{
					accountId: references.accountId,
					name: 'Debug Rent',
					categoryId: references.expenseCategoryId,
					amount: 1100,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						2,
					),
					endDate: null,
					type: 'expense',
					recurrenceBase: 'month',
					recurrenceInterval: 1,
				},
				{
					accountId: references.accountId,
					name: 'Debug Groceries',
					categoryId: references.expenseCategoryId,
					amount: 95,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						3,
					),
					endDate: null,
					type: 'expense',
					recurrenceBase: 'week',
					recurrenceInterval: 1,
				},
				{
					accountId: references.accountId,
					name: 'Debug Commute',
					categoryId: references.expenseCategoryId,
					amount: 8,
					startDate: new Date(
						baseDate.getFullYear(),
						baseDate.getMonth(),
						1,
					),
					endDate: null,
					type: 'expense',
					recurrenceBase: 'day',
					recurrenceInterval: 2,
				},
			];

			await db
				.insert(schema.plannedTransactions)
				.values(samplePlannedTransactions);

			const transactionOccurrenceVersioning =
				useTransactionOccurrenceVersioning.getState();
			const balanceVersioning = useBalanceVersioning.getState();

			for (const transaction of samplePlannedTransactions) {
				transactionOccurrenceVersioning.onPlannedTransactionCreated(
					transaction,
				);
				balanceVersioning.onPlannedTransactionCreated(transaction);
			}

			setActionStatus(
				'Inserted recurring sample set: 3 incomes and 3 expenses.',
				'success',
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			setActionStatus(
				`Failed to insert planned sample set: ${message}`,
				'error',
			);
		} finally {
			setIsAddingSamplePlannedSet(false);
		}
	}, [ensureDebugDbReferences, normalizedStartDate, setActionStatus]);

	const handleClearFinancialDebugData = useCallback(async () => {
		if (!isDbReal) {
			setActionStatus(
				'Database debug actions are disabled on web builds.',
				'info',
			);
			return;
		}

		setIsClearingDb(true);

		try {
			const plannedRows = await db
				.select()
				.from(schema.plannedTransactions);
			const realRows = await db.select().from(schema.realTransactions);
			const reconciliationRows = await db
				.select()
				.from(schema.balanceReconciliations);

			await db.delete(schema.realTransactions);
			await db.delete(schema.plannedTransactions);
			await db.delete(schema.balanceReconciliations);

			const transactionOccurrenceVersioning =
				useTransactionOccurrenceVersioning.getState();
			const balanceVersioning = useBalanceVersioning.getState();

			for (const deleted of realRows) {
				const deletedRealTransaction: RealTransaction = {
					accountId: deleted.accountId,
					name: deleted.name,
					categoryId: deleted.categoryId,
					amount: deleted.amount,
					date: toDate(deleted.date),
					type: deleted.type,
					plannedTransactionId: deleted.plannedTransactionId ?? null,
				};

				transactionOccurrenceVersioning.onRealTransactionDeleted(
					deletedRealTransaction,
				);
				balanceVersioning.onRealTransactionDeleted(
					deletedRealTransaction,
				);
			}

			for (const deleted of plannedRows) {
				const deletedPlannedTransaction: PlannedTransaction = {
					accountId: deleted.accountId,
					name: deleted.name,
					categoryId: deleted.categoryId,
					amount: deleted.amount,
					startDate: toDate(deleted.startDate),
					endDate:
						deleted.endDate == null
							? null
							: toDate(deleted.endDate),
					type: deleted.type,
					recurrenceBase: deleted.recurrenceBase ?? null,
					recurrenceInterval: deleted.recurrenceInterval,
				};

				transactionOccurrenceVersioning.onPlannedTransactionDeleted(
					deletedPlannedTransaction,
				);
				balanceVersioning.onPlannedTransactionDeleted(
					deletedPlannedTransaction,
				);
			}

			for (const deleted of reconciliationRows) {
				const deletedReconciliation: BalanceReconciliation = {
					accountId: deleted.accountId,
					date: toDate(deleted.date),
					amount: deleted.amount,
				};

				balanceVersioning.onBalanceReconciliationDeleted(
					deletedReconciliation,
				);
			}

			const deletedCount =
				realRows.length +
				plannedRows.length +
				reconciliationRows.length;

			if (deletedCount === 0) {
				setActionStatus(
					'No planned, real, or reconciliation rows to clear.',
					'info',
				);
				return;
			}

			setActionStatus(
				`Cleared DB rows: planned ${plannedRows.length}, real ${realRows.length}, reconciliations ${reconciliationRows.length}.`,
				'success',
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			setActionStatus(`Failed to clear DB rows: ${message}`, 'error');
		} finally {
			setIsClearingDb(false);
		}
	}, [setActionStatus]);

	const handleAddRealTransaction = useCallback(async () => {
		if (!isDbReal) {
			setActionStatus(
				'Database debug actions are disabled on web builds.',
				'info',
			);
			return;
		}

		const parsedDate = parseDateInput(realTransactionDateInput);
		if (parsedDate == null) {
			setActionStatus(
				'Use format YYYY-MM-DD for real transaction date.',
				'error',
			);
			return;
		}

		const parsedAmount = parseAmountInput(realTransactionAmountInput);
		if (parsedAmount == null || parsedAmount === 0) {
			setActionStatus(
				'Enter a non-zero amount for real transaction.',
				'error',
			);
			return;
		}

		setIsAddingRealTransaction(true);

		try {
			const references = await ensureDebugDbReferences();
			const transactionType: TransactionType =
				parsedAmount > 0 ? 'income' : 'expense';
			const normalizedAmount = Math.abs(parsedAmount);

			const createdRealTransaction: RealTransaction = {
				accountId: references.accountId,
				name:
					transactionType === 'income'
						? 'Debug real income'
						: 'Debug real expense',
				categoryId:
					transactionType === 'income'
						? references.incomeCategoryId
						: references.expenseCategoryId,
				amount: normalizedAmount,
				date: parsedDate,
				type: transactionType,
				plannedTransactionId: null,
			};

			await db
				.insert(schema.realTransactions)
				.values(createdRealTransaction);

			useTransactionOccurrenceVersioning
				.getState()
				.onRealTransactionCreated(createdRealTransaction);
			useBalanceVersioning
				.getState()
				.onRealTransactionCreated(createdRealTransaction);

			setActionStatus(
				`Added real ${transactionType} on ${formatDateInput(parsedDate)} for ${formatCurrency(parsedAmount)}.`,
				'success',
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			setActionStatus(
				`Failed to add real transaction: ${message}`,
				'error',
			);
		} finally {
			setIsAddingRealTransaction(false);
		}
	}, [
		ensureDebugDbReferences,
		realTransactionDateInput,
		realTransactionAmountInput,
		setActionStatus,
	]);

	const handleDeleteRealTransactionsAtDate = useCallback(async () => {
		if (!isDbReal) {
			setActionStatus(
				'Database debug actions are disabled on web builds.',
				'info',
			);
			return;
		}

		const parsedDate = parseDateInput(realTransactionDateInput);
		if (parsedDate == null) {
			setActionStatus(
				'Use format YYYY-MM-DD for real transaction date.',
				'error',
			);
			return;
		}

		setIsDeletingRealTransactions(true);

		try {
			const dayBounds = getDayBounds(parsedDate);
			const matchingTransactions = await db
				.select()
				.from(schema.realTransactions)
				.where(
					and(
						gte(schema.realTransactions.date, dayBounds.start),
						lt(
							schema.realTransactions.date,
							dayBounds.endExclusive,
						),
					),
				);

			if (matchingTransactions.length === 0) {
				setActionStatus(
					`No real transactions found on ${formatDateInput(parsedDate)}.`,
					'info',
				);
				return;
			}

			await db
				.delete(schema.realTransactions)
				.where(
					and(
						gte(schema.realTransactions.date, dayBounds.start),
						lt(
							schema.realTransactions.date,
							dayBounds.endExclusive,
						),
					),
				);

			const transactionOccurrenceVersioning =
				useTransactionOccurrenceVersioning.getState();
			const balanceVersioning = useBalanceVersioning.getState();

			for (const deleted of matchingTransactions) {
				const deletedRealTransaction: RealTransaction = {
					accountId: deleted.accountId,
					name: deleted.name,
					categoryId: deleted.categoryId,
					amount: deleted.amount,
					date: toDate(deleted.date),
					type: deleted.type,
					plannedTransactionId: deleted.plannedTransactionId ?? null,
				};

				transactionOccurrenceVersioning.onRealTransactionDeleted(
					deletedRealTransaction,
				);
				balanceVersioning.onRealTransactionDeleted(
					deletedRealTransaction,
				);
			}

			setActionStatus(
				`Deleted ${matchingTransactions.length} real transaction${
					matchingTransactions.length === 1 ? '' : 's'
				} on ${formatDateInput(parsedDate)}.`,
				'success',
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			setActionStatus(
				`Failed to delete real transactions: ${message}`,
				'error',
			);
		} finally {
			setIsDeletingRealTransactions(false);
		}
	}, [realTransactionDateInput, setActionStatus]);

	const applyStartDateInput = useCallback(() => {
		const parsedDate = parseDateInput(startDateInput);
		if (parsedDate == null) {
			setInputError('Use format YYYY-MM-DD, for example 2026-03-17.');
			return;
		}

		const normalizedDate = normalizeToMonthStart(parsedDate);
		setNormalizedStartDate(normalizedDate);
		setMonthCountFromStart(INITIAL_MIN_MONTHS);
		setInputError(null);
	}, [startDateInput]);

	const handleEndReached = useCallback(() => {
		if (endReachedDuringMomentum.current) {
			return;
		}

		endReachedDuringMomentum.current = true;
		setMonthCountFromStart((currentCount) =>
			Math.min(currentCount + LOAD_CHUNK_SIZE, MAX_AUTO_FILL_MONTHS),
		);
	}, []);

	const handleListLayout = useCallback((event: LayoutChangeEvent) => {
		setListViewportHeight(event.nativeEvent.layout.height);
	}, []);

	const handleListContentSizeChange = useCallback(
		(_width: number, height: number) => {
			setListContentHeight(height);
		},
		[],
	);

	useEffect(() => {
		if (listViewportHeight <= 0 || listContentHeight <= 0) {
			return;
		}

		if (
			listContentHeight <=
				listViewportHeight + AUTO_FILL_HEIGHT_EPSILON &&
			monthCountFromStart < INITIAL_MAX_MONTHS
		) {
			setMonthCountFromStart((currentCount) =>
				Math.min(currentCount + LOAD_CHUNK_SIZE, INITIAL_MAX_MONTHS),
			);
		}
	}, [listViewportHeight, listContentHeight, monthCountFromStart]);

	const actionMessageColor =
		actionMessageTone === 'error'
			? '$danger500'
			: actionMessageTone === 'success'
				? '#1d6f42'
				: '$black';

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
			<Stack.Screen options={{ title: 'Financial Debug / Test' }} />
			<YStack
				backgroundColor={'$white'}
				paddingTop={'$paddingmd'}
				paddingHorizontal={10}
				flex={1}
				gap={'$2'}
			>
				<YStack
					gap={'$2'}
					borderWidth={1}
					borderColor={'#d7dbe0'}
					borderRadius={10}
					padding={'$3'}
					backgroundColor={'#f6f8fa'}
				>
					<SizableText fontSize={'$title3'} fontWeight={'700'}>
						Financial Calculations Debug / Test View
					</SizableText>
					<Text fontSize={'$2'} color={'$black'}>
						Temporary screen using hook data only:
						useOccurrencesAndBalances.
					</Text>

					<XStack gap={'$2'} alignItems={'center'}>
						<TextInput
							value={startDateInput}
							onChangeText={setStartDateInput}
							placeholder={'YYYY-MM-DD'}
							placeholderTextColor="#a3a3a3"
							selectionColor={'#0A5B55'}
							style={{
								flex: 1,
								color: '#0A5B55',
								fontFamily: INPUT_FONT_FAMILY,
								fontSize: 16,
								lineHeight: 22,
								backgroundColor: '#ffffff',
								borderColor: '#0A5B55',
								borderWidth: 1,
								borderRadius: 10,
								paddingHorizontal: 12,
								paddingVertical: 8,
							}}
							autoCapitalize={'none'}
							autoCorrect={false}
						/>
						<Button onPress={applyStartDateInput}>Apply</Button>
					</XStack>

					<XStack gap={'$2'} alignItems={'center'}>
						<TextInput
							value={reconciliationDateInput}
							onChangeText={setReconciliationDateInput}
							placeholder={'Recon YYYY-MM-DD'}
							placeholderTextColor="#a3a3a3"
							selectionColor={'#0A5B55'}
							style={{
								flex: 1,
								color: '#0A5B55',
								fontFamily: INPUT_FONT_FAMILY,
								fontSize: 15,
								lineHeight: 20,
								backgroundColor: '#ffffff',
								borderColor: '#0A5B55',
								borderWidth: 1,
								borderRadius: 10,
								paddingHorizontal: 12,
								paddingVertical: 8,
							}}
							autoCapitalize={'none'}
							autoCorrect={false}
						/>
						<TextInput
							value={reconciliationAmountInput}
							onChangeText={setReconciliationAmountInput}
							placeholder={'Balance'}
							placeholderTextColor="#a3a3a3"
							selectionColor={'#0A5B55'}
							keyboardType={'decimal-pad'}
							style={{
								width: 110,
								color: '#0A5B55',
								fontFamily: INPUT_FONT_FAMILY,
								fontSize: 15,
								lineHeight: 20,
								backgroundColor: '#ffffff',
								borderColor: '#0A5B55',
								borderWidth: 1,
								borderRadius: 10,
								paddingHorizontal: 12,
								paddingVertical: 8,
							}}
							autoCapitalize={'none'}
							autoCorrect={false}
						/>
						<Button
							onPress={handleAddBalanceReconciliation}
							disabled={!isDbReal || isAddingReconciliation}
						>
							{isAddingReconciliation
								? 'Adding...'
								: 'Add reconciliation'}
						</Button>
					</XStack>

					<XStack gap={'$2'} alignItems={'center'}>
						<Button
							flex={1}
							onPress={handleAddSampleRecurringPlannedSet}
							disabled={
								!isDbReal ||
								isAddingSamplePlannedSet ||
								isClearingDb
							}
						>
							{isAddingSamplePlannedSet
								? 'Adding sample set...'
								: 'Add sample recurring planned set'}
						</Button>
						<Button
							flex={1}
							onPress={handleClearFinancialDebugData}
							disabled={
								!isDbReal ||
								isClearingDb ||
								isAddingSamplePlannedSet
							}
							backgroundColor={'#b42318'}
							pressStyle={{ backgroundColor: '#8f2f24' }}
							color={'$white'}
						>
							{isClearingDb ? 'Clearing DB...' : 'Clear DB data'}
						</Button>
					</XStack>

					<YStack gap={'$2'}>
						<XStack gap={'$2'} alignItems={'center'}>
							<TextInput
								value={realTransactionDateInput}
								onChangeText={setRealTransactionDateInput}
								placeholder={'Real YYYY-MM-DD'}
								placeholderTextColor="#a3a3a3"
								selectionColor={'#0A5B55'}
								style={{
									flex: 1,
									color: '#0A5B55',
									fontFamily: INPUT_FONT_FAMILY,
									fontSize: 15,
									lineHeight: 20,
									backgroundColor: '#ffffff',
									borderColor: '#0A5B55',
									borderWidth: 1,
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 8,
								}}
								autoCapitalize={'none'}
								autoCorrect={false}
							/>
							<TextInput
								value={realTransactionAmountInput}
								onChangeText={setRealTransactionAmountInput}
								placeholder={'Amount +/-'}
								placeholderTextColor="#a3a3a3"
								selectionColor={'#0A5B55'}
								keyboardType={'decimal-pad'}
								style={{
									width: 110,
									color: '#0A5B55',
									fontFamily: INPUT_FONT_FAMILY,
									fontSize: 15,
									lineHeight: 20,
									backgroundColor: '#ffffff',
									borderColor: '#0A5B55',
									borderWidth: 1,
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 8,
								}}
								autoCapitalize={'none'}
								autoCorrect={false}
							/>
							<Button
								onPress={handleAddRealTransaction}
								disabled={!isDbReal || isAddingRealTransaction}
							>
								{isAddingRealTransaction
									? 'Adding...'
									: 'Add real'}
							</Button>
						</XStack>

						<XStack gap={'$2'} alignItems={'center'}>
							<TextInput
								value={realTransactionDateInput}
								onChangeText={setRealTransactionDateInput}
								placeholder={'Delete YYYY-MM-DD'}
								placeholderTextColor="#a3a3a3"
								selectionColor={'#0A5B55'}
								style={{
									flex: 1,
									color: '#0A5B55',
									fontFamily: INPUT_FONT_FAMILY,
									fontSize: 15,
									lineHeight: 20,
									backgroundColor: '#ffffff',
									borderColor: '#0A5B55',
									borderWidth: 1,
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 8,
								}}
								autoCapitalize={'none'}
								autoCorrect={false}
							/>
							<Button
								onPress={handleDeleteRealTransactionsAtDate}
								disabled={
									!isDbReal || isDeletingRealTransactions
								}
							>
								{isDeletingRealTransactions
									? 'Deleting...'
									: 'Delete date'}
							</Button>
						</XStack>
					</YStack>

					{inputError != null ? (
						<Text fontSize={'$2'} color={'$danger500'}>
							{inputError}
						</Text>
					) : null}

					{actionMessage != null ? (
						<Text fontSize={'$2'} color={actionMessageColor}>
							{actionMessage}
						</Text>
					) : null}

					<Text fontSize={'$2'} color={'$black'}>
						Normalized month start:{' '}
						{formatMonthLabel(normalizedStartDate)}
					</Text>
					<Text fontSize={'$2'} color={'$black'}>
						Range: {createMonthKey(startYear, startMonth)} to{' '}
						{createMonthKey(endYear, endMonth)}
					</Text>
					<Text fontSize={'$2'} color={'$black'}>
						Initial load: {INITIAL_MIN_MONTHS} months
					</Text>
					<Text fontSize={'$2'} color={'$black'}>
						Auto-fill can extend up to {INITIAL_MAX_MONTHS} months
						if the screen is not scrollable yet
					</Text>
					<Text fontSize={'$2'} color={'$black'}>
						Load chunk size: {LOAD_CHUNK_SIZE} months per scroll-end
						trigger
					</Text>
				</YStack>

				<FlatList
					data={monthItems}
					keyExtractor={(item) => item.monthKey}
					onLayout={handleListLayout}
					onContentSizeChange={handleListContentSizeChange}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.4}
					onScrollBeginDrag={() => {
						endReachedDuringMomentum.current = false;
					}}
					onMomentumScrollBegin={() => {
						endReachedDuringMomentum.current = false;
					}}
					ItemSeparatorComponent={itemSeparator}
					renderItem={renderMonthItem}
					ListFooterComponent={
						<YStack paddingVertical={'$3'} alignItems={'center'}>
							<Text fontSize={'$2'} color={'$black'}>
								Scroll down to load {LOAD_CHUNK_SIZE} more
								months
							</Text>
						</YStack>
					}
				/>
			</YStack>
		</SafeAreaView>
	);
}
