import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { YStack } from 'tamagui';
import {
	type Breakdown,
	MonthBreakdownCard,
	type ProcessedItem,
} from '@/src/components/MonthBreakdownCard';
import type { TransactionOccurrence } from '@/src/dataModel';
import { useTransactionOccurrencesCache } from '@/src/finance/cache/transactionOccurrencesCache';
import { useTransactionSummaries } from '@/src/finance/hook/useTransactionSummaries';
import { allocateHeights, CARD_GAP } from '@/src/finance/logic/allocateHeights';
import { createMonthKey } from '@/src/finance/logic/util';
import { useCategoryStore } from '@/src/store/categoryStore';
import { getCategoryDisplayName } from '@/src/utils/categoryName';

type CategoryGroup = { total: number; items: TransactionOccurrence[] };

const MONTH_KEYS = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december',
];

export default function DetailedMonthScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { t, i18n } = useTranslation();

	const [yearStr, monthStr] = id.split('-');
	const yearNum = Number(yearStr);
	const monthNum = Number(monthStr);
	const formattedTitle = `${t(MONTH_KEYS[monthNum])} ${yearNum}`;

	const categories = useCategoryStore((state) => state.categories);
	const categoryNameById = useMemo(() => {
		const map = new Map<number, string>();
		for (const category of categories) {
			map.set(
				category.id,
				getCategoryDisplayName(category.name, i18n.language),
			);
		}
		return map;
	}, [categories, i18n.language]);

	const monthDataArray = useTransactionSummaries(
		yearNum,
		monthNum,
		yearNum,
		monthNum,
	);
	const monthData = monthDataArray[0];

	const monthKey = createMonthKey(yearNum, monthNum);
	const occurrencesState = useTransactionOccurrencesCache((state) =>
		state.getMonth(monthKey),
	);
	const allOccurrences = occurrencesState.transactionOccurrences;

	const { expenseBreakdown, incomeBreakdown, totalExpenses, totalIncomes } =
		useMemo(() => {
			if (!monthData) {
				return {
					expenseBreakdown: [] as Breakdown,
					incomeBreakdown: [] as Breakdown,
					totalExpenses: 0,
					totalIncomes: 0,
				};
			}

			let totalExp = 0;
			let totalInc = 0;
			const expensesByCat: Record<string, CategoryGroup> = {};
			const incomesByCat: Record<string, CategoryGroup> = {};

			for (const occ of allOccurrences) {
				const amount = Math.abs(occ.amount);
				const catIdStr = String(occ.categoryId);

				if (occ.type === 'expense') {
					totalExp += amount;
					expensesByCat[catIdStr] ??= { total: 0, items: [] };
					expensesByCat[catIdStr].total += amount;
					expensesByCat[catIdStr].items.push(occ);
				} else if (occ.type === 'income') {
					totalInc += amount;
					incomesByCat[catIdStr] ??= { total: 0, items: [] };
					incomesByCat[catIdStr].total += amount;
					incomesByCat[catIdStr].items.push(occ);
				}
			}

			const formatBreakdown = (
				byCat: Record<string, CategoryGroup>,
			): Breakdown => {
				// Items merged across categories need unique keys inside the card
				let nextId = 0;

				return Object.entries(byCat)
					.map(([categoryId, data]) => {
						const numericCategoryId = Number(categoryId);
						const categoryName =
							numericCategoryId === 0
								? t('Uncategorized default')
								: (categoryNameById.get(numericCategoryId) ??
									t('Uncategorized'));

						// Merge same-name items, keeping planned and real ones separate
						const merged: Record<
							string,
							{
								name: string;
								amount: number;
								count: number;
								isReal: boolean;
							}
						> = {};
						for (const occ of data.items) {
							const isReal = !!occ.realTransaction;
							const mergeKey = `${occ.name}-${isReal}`;
							const amount = Math.abs(occ.amount);
							if (!merged[mergeKey]) {
								merged[mergeKey] = {
									name: occ.name,
									amount,
									count: 1,
									isReal,
								};
							} else {
								merged[mergeKey].amount += amount;
								merged[mergeKey].count += 1;
							}
						}

						const items: ProcessedItem[] = Object.values(merged)
							.sort((a, b) => b.amount - a.amount)
							.map((item) => {
								const baseName = item.isReal
									? item.name
									: `${item.name} (${t('Planned')})`;
								return {
									id: nextId++,
									name:
										item.count > 1
											? `${baseName} (x${item.count})`
											: baseName,
									count: item.count,
									totalAmount: item.amount,
								};
							});

						return { categoryName, total: data.total, items };
					})
					.sort((a, b) => b.total - a.total);
			};

			return {
				expenseBreakdown: formatBreakdown(expensesByCat),
				incomeBreakdown: formatBreakdown(incomesByCat),
				totalExpenses: totalExp,
				totalIncomes: totalInc,
			};
		}, [monthData, allOccurrences, t, categoryNameById]);

	const [availableHeight, setAvailableHeight] = useState(0);
	const [incomeNeed, setIncomeNeed] = useState(0);
	const [expenseNeed, setExpenseNeed] = useState(0);

	const heights = useMemo(
		() =>
			availableHeight > 0 && incomeNeed > 0 && expenseNeed > 0
				? allocateHeights(availableHeight, incomeNeed, expenseNeed)
				: {},
		[availableHeight, incomeNeed, expenseNeed],
	);

	const handleIncomeNeed = useCallback((h: number) => setIncomeNeed(h), []);
	const handleExpenseNeed = useCallback((h: number) => setExpenseNeed(h), []);

	return (
		<YStack flex={1} backgroundColor="$background">
			<Stack.Screen
				options={{
					title: formattedTitle,
					headerLargeTitle: false,
					headerTitleAlign: 'center',
					headerBackButtonDisplayMode: 'minimal',
				}}
			/>
			<YStack flex={1} padding="$4" paddingBottom="$10">
				<YStack
					flex={1}
					gap={CARD_GAP}
					justifyContent="flex-start"
					onLayout={(e: LayoutChangeEvent) =>
						setAvailableHeight(e.nativeEvent.layout.height)
					}
				>
					<MonthBreakdownCard
						title={t('Incomes')}
						total={totalIncomes}
						breakdown={incomeBreakdown}
						emptyText={t('No income this month')}
						keyPrefix="income"
						maxHeight={heights.income}
						onNaturalHeightChange={handleIncomeNeed}
					/>
					<MonthBreakdownCard
						title={t('Expenses')}
						total={totalExpenses}
						breakdown={expenseBreakdown}
						emptyText={t('No expenses this month')}
						keyPrefix="expense"
						maxHeight={heights.expense}
						onNaturalHeightChange={handleExpenseNeed}
					/>
				</YStack>
			</YStack>
		</YStack>
	);
}