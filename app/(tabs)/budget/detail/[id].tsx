import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { YStack } from 'tamagui';
import {
	MonthBreakdownCard,
	type ProcessedItem,
} from '@/src/components/MonthBreakdownCard';
import { usePlannedTransactions } from '@/src/finance/hook/usePlannedTransactions';
import { allocateHeights, CARD_GAP } from '@/src/finance/logic/allocateHeights';
import { getTransactionOccurrenceCount } from '@/src/finance/logic/util';
import { useCategoryStore } from '@/src/store/categoryStore';
import { getCategoryDisplayName } from '@/src/utils/categoryName';

export default function BudgetDetailedMonthScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { t, i18n } = useTranslation();

	const [yearStr, monthStr] = id.split('-');
	const yearNum = Number(yearStr);
	const monthNum = Number(monthStr);

	const monthKeys = [
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
	const translatedMonth = t(monthKeys[monthNum]);
	const formattedTitle = `${translatedMonth} ${yearNum}`;

	const plannedTransactions = usePlannedTransactions();
	const categories = useCategoryStore((state) => state.categories);
	const categoryNameById = useMemo(
		() =>
			new Map(
				categories.map((category) => [
					category.id,
					getCategoryDisplayName(category.name, i18n.language),
				]),
			),
		[categories, i18n.language],
	);

	const { expenseBreakdown, incomeBreakdown, totalExpenses, totalIncomes } =
		useMemo(() => {
			let totalExp = 0;
			let totalInc = 0;

			const expensesByCat: Record<
				string,
				{ total: number; items: ProcessedItem[] }
			> = {};
			const incomesByCat: Record<
				string,
				{ total: number; items: ProcessedItem[] }
			> = {};

			for (const evt of plannedTransactions) {
				const count = getTransactionOccurrenceCount(
					evt,
					yearNum,
					monthNum,
				);
				if (count === 0) continue;

				const totalAmount = Math.abs(evt.amount) * count;
				const catIdStr = String(evt.categoryId);

				const processedItem: ProcessedItem = {
					id: evt.id,
					name: evt.name,
					count: count,
					totalAmount: totalAmount,
				};

				if (evt.type === 'expense') {
					totalExp += totalAmount;
					if (!expensesByCat[catIdStr]) {
						expensesByCat[catIdStr] = { total: 0, items: [] };
					}
					expensesByCat[catIdStr].total += totalAmount;
					expensesByCat[catIdStr].items.push(processedItem);
				} else if (evt.type === 'income') {
					totalInc += totalAmount;
					if (!incomesByCat[catIdStr]) {
						incomesByCat[catIdStr] = { total: 0, items: [] };
					}
					incomesByCat[catIdStr].total += totalAmount;
					incomesByCat[catIdStr].items.push(processedItem);
				}
			}

			const formatBreakdown = (
				categoryMap: Record<
					string,
					{ total: number; items: ProcessedItem[] }
				>,
			) => {
				return Object.entries(categoryMap)
					.map(([categoryId, data]) => {
						const numericCategoryId = Number(categoryId);
						const categoryName =
							numericCategoryId === 0
								? t('Uncategorized')
								: (categoryNameById.get(numericCategoryId) ??
									`${t('Category')} ${categoryId}`);

						const sortedItems = [...data.items].sort(
							(a, b) =>
								Math.abs(b.totalAmount) -
								Math.abs(a.totalAmount),
						);

						return {
							categoryName,
							total: data.total,
							items: sortedItems,
						};
					})
					.sort((a, b) => b.total - a.total);
			};

			return {
				expenseBreakdown: formatBreakdown(expensesByCat),
				incomeBreakdown: formatBreakdown(incomesByCat),
				totalExpenses: totalExp,
				totalIncomes: totalInc,
			};
		}, [plannedTransactions, yearNum, monthNum, t, categoryNameById]);

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

	const handleIncomeNeed = useCallback((h: number) => {
		const r = Math.round(h);
		setIncomeNeed((prev) => (prev === r ? prev : r));
	}, []);
	const handleExpenseNeed = useCallback((h: number) => {
		const r = Math.round(h);
		setExpenseNeed((prev) => (prev === r ? prev : r));
	}, []);

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
				{/* No padding on this one, so its measured height is exactly the space available to the cards */}
				<YStack
					flex={1}
					gap={CARD_GAP}
					justifyContent="flex-start"
					onLayout={(e: LayoutChangeEvent) => {
						const r = Math.round(e.nativeEvent.layout.height);
						setAvailableHeight((prev) => (prev === r ? prev : r));
					}}
				>
					<MonthBreakdownCard
						title={t('Planned Incomes')}
						total={totalIncomes}
						breakdown={incomeBreakdown}
						emptyText={t('No income planned')}
						keyPrefix="income"
						maxHeight={heights.income}
						onNaturalHeightChange={handleIncomeNeed}
					/>
					<MonthBreakdownCard
						title={t('Planned Expenses')}
						total={totalExpenses}
						breakdown={expenseBreakdown}
						emptyText={t('No expenses planned')}
						keyPrefix="expense"
						maxHeight={heights.expense}
						onNaturalHeightChange={handleExpenseNeed}
					/>
				</YStack>
			</YStack>
		</YStack>
	);
}
