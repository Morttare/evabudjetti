import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Button, Card, Separator, SizableText, XStack, YStack } from 'tamagui';
import type { TransactionOccurrence } from '@/src/dataModel';
import { useTransactionOccurrencesCache } from '@/src/finance/cache/transactionOccurrencesCache';
import { useTransactionSummaries } from '@/src/finance/hook/useTransactionSummaries';
import { createMonthKey } from '@/src/finance/logic/util';
import { useCategoryStore } from '@/src/store/categoryStore';

type GroupedItem = {
	name: string;
	amount: number;
	count: number;
	isReal: boolean;
};

export default function DetailedMonthScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [expensesExpanded, setExpensesExpanded] = useState(false);
	const [incomeExpanded, setIncomeExpanded] = useState(false);
	const { t } = useTranslation();

	const [yearStr, monthStr] = id.split('-');
	const yearNum = Number(yearStr);
	const monthNum = Number(monthStr);
	const categories = useCategoryStore((state) => state.categories);

	const categoryNameById = useMemo(() => {
		const map = new Map<number, string>();
		for (const category of categories) {
			map.set(category.id, category.name);
		}
		return map;
	}, [categories]);

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
			if (!monthData)
				return {
					expenseBreakdown: [],
					incomeBreakdown: [],
					totalExpenses: 0,
					totalIncomes: 0,
				};

			let totalExp = 0;
			let totalInc = 0;

			const expensesByCat: Record<
				string,
				{ total: number; items: TransactionOccurrence[] }
			> = {};
			const incomesByCat: Record<
				string,
				{ total: number; items: TransactionOccurrence[] }
			> = {};

			for (const occ of allOccurrences) {
				const amount = Math.abs(occ.amount);
				const catIdStr = String(occ.categoryId);

				if (occ.type === 'expense') {
					totalExp += amount;
					if (!expensesByCat[catIdStr]) {
						expensesByCat[catIdStr] = { total: 0, items: [] };
					}
					expensesByCat[catIdStr].total += amount;
					expensesByCat[catIdStr].items.push(occ);
				} else if (occ.type === 'income') {
					totalInc += amount;
					if (!incomesByCat[catIdStr]) {
						incomesByCat[catIdStr] = { total: 0, items: [] };
					}
					incomesByCat[catIdStr].total += amount;
					incomesByCat[catIdStr].items.push(occ);
				}
			}

			const expenseBreakdown = Object.entries(expensesByCat)
				.map(([categoryId, data]) => {
					const numericCategoryId = Number(categoryId);
					const categoryName =
						numericCategoryId === 0
							? t('Uncategorized default')
							: (categoryNameById.get(numericCategoryId) ??
								t('Uncategorized'));

					const mergedItemsMap: Record<string, GroupedItem> = {};
					for (const occ of data.items) {
						const mergeKey = `${occ.name}-${!!occ.realTransaction}`;
						if (!mergedItemsMap[mergeKey]) {
							mergedItemsMap[mergeKey] = {
								name: occ.name,
								amount: Math.abs(occ.amount),
								count: 1,
								isReal: !!occ.realTransaction,
							};
						} else {
							mergedItemsMap[mergeKey].amount += Math.abs(
								occ.amount,
							);
							mergedItemsMap[mergeKey].count += 1;
						}
					}

					const mergedItems = Object.values(mergedItemsMap).sort(
						(a, b) => b.amount - a.amount,
					);

					return {
						categoryName,
						total: data.total,
						items: mergedItems,
					};
				})
				.sort((a, b) => b.total - a.total);

			const incomeBreakdown = Object.entries(incomesByCat)
				.map(([categoryId, data]) => {
					const numericCategoryId = Number(categoryId);
					const categoryName =
						numericCategoryId === 0
							? t('Uncategorized default')
							: (categoryNameById.get(numericCategoryId) ??
								t('Uncategorized'));

					const mergedItemsMap: Record<string, GroupedItem> = {};
					for (const occ of data.items) {
						const mergeKey = `${occ.name}-${!!occ.realTransaction}`;
						if (!mergedItemsMap[mergeKey]) {
							mergedItemsMap[mergeKey] = {
								name: occ.name,
								amount: Math.abs(occ.amount),
								count: 1,
								isReal: !!occ.realTransaction,
							};
						} else {
							mergedItemsMap[mergeKey].amount += Math.abs(
								occ.amount,
							);
							mergedItemsMap[mergeKey].count += 1;
						}
					}
					const mergedItems = Object.values(mergedItemsMap).sort(
						(a, b) => b.amount - a.amount,
					);

					return {
						categoryName,
						total: data.total,
						items: mergedItems,
					};
				})
				.sort((a, b) => b.total - a.total);

			return {
				expenseBreakdown,
				incomeBreakdown,
				totalExpenses: totalExp,
				totalIncomes: totalInc,
			};
		}, [monthData, allOccurrences, t, categoryNameById]);

	return (
		<YStack flex={1} backgroundColor="$background">
			<Stack.Screen
				options={{
					title: formattedTitle,
					headerLargeTitle: false,
					headerTitleAlign: 'center',
				}}
			/>
			<ScrollView contentInsetAdjustmentBehavior="never">
				<YStack padding="$4" gap="$4" paddingBottom="$10">
					<YStack gap="$2">
						<Button
							height={60}
							justifyContent="space-between"
							onPress={() =>
								setExpensesExpanded(!expensesExpanded)
							}
							backgroundColor="white"
							borderWidth={1}
							borderColor="$borderColor"
						>
							<SizableText fontWeight="bold">
								{t('Expenses')}
							</SizableText>
							<XStack gap="$2" alignItems="center">
								<SizableText fontWeight="bold">
									{`${totalExpenses.toFixed(2)} €`}
								</SizableText>
								{expensesExpanded ? (
									<ChevronUp size={20} />
								) : (
									<ChevronDown size={20} />
								)}
							</XStack>
						</Button>

						{expensesExpanded && (
							<Card
								bordered
								padding="$4"
								backgroundColor="#fafafa"
							>
								{expenseBreakdown.length === 0 ? (
									<SizableText
										color="$color10"
										textAlign="center"
										paddingVertical="$2"
									>
										{t('No expenses this month')}
									</SizableText>
								) : (
									<YStack
										separator={
											<Separator
												borderColor="$borderColor"
												opacity={0.5}
											/>
										}
									>
										{expenseBreakdown.map((cat) => (
											<YStack
												key={cat.categoryName}
												paddingVertical="$2"
											>
												<XStack justifyContent="space-between">
													<SizableText
														fontWeight="bold"
														fontSize={15}
													>
														{cat.categoryName}
													</SizableText>
													<SizableText fontWeight="bold">
														{`${cat.total.toFixed(2)} €`}
													</SizableText>
												</XStack>

												{cat.items.map(
													(item: GroupedItem) => {
														const baseName =
															item.isReal
																? item.name
																: `${item.name} (${t('Planned')})`;

														const displayName =
															item.count > 1
																? `${baseName} (x${item.count})`
																: baseName;

														return (
															<XStack
																key={`${cat.categoryName}-${item.name}-${item.isReal}`}
																justifyContent="space-between"
																paddingLeft="$3"
																marginTop="$1"
															>
																<SizableText
																	size="$3"
																	color="$color11"
																>
																	{displayName}
																</SizableText>
																<SizableText
																	size="$3"
																	color="$color11"
																>
																	{`${Math.abs(item.amount).toFixed(2)} €`}
																</SizableText>
															</XStack>
														);
													},
												)}
											</YStack>
										))}
									</YStack>
								)}
							</Card>
						)}
					</YStack>

					<YStack gap="$2">
						<Button
							height={60}
							justifyContent="space-between"
							onPress={() => setIncomeExpanded(!incomeExpanded)}
							backgroundColor="white"
							borderWidth={1}
							borderColor="$borderColor"
						>
							<SizableText fontWeight="bold">
								{t('Incomes')}
							</SizableText>
							<XStack gap="$2" alignItems="center">
								<SizableText fontWeight="bold">
									{`${totalIncomes.toFixed(2)} €`}
								</SizableText>
								{incomeExpanded ? (
									<ChevronUp size={20} />
								) : (
									<ChevronDown size={20} />
								)}
							</XStack>
						</Button>

						{incomeExpanded && (
							<Card
								bordered
								padding="$4"
								backgroundColor="#FAFAFA"
							>
								{incomeBreakdown.length === 0 ? (
									<SizableText
										color="$color10"
										textAlign="center"
										paddingVertical="$2"
									>
										{t('No income this month')}
									</SizableText>
								) : (
									<YStack
										separator={
											<Separator
												borderColor="$borderColor"
												opacity={0.5}
											/>
										}
									>
										{incomeBreakdown.map((cat) => (
											<YStack
												key={cat.categoryName}
												paddingVertical="$2"
											>
												<XStack justifyContent="space-between">
													<SizableText
														fontWeight="bold"
														fontSize={15}
													>
														{cat.categoryName}
													</SizableText>
													<SizableText fontWeight="bold">
														{`${cat.total.toFixed(2)} €`}
													</SizableText>
												</XStack>

												{cat.items.map(
													(item: GroupedItem) => {
														const baseName =
															item.isReal
																? item.name
																: `${item.name} (${t('Planned')})`;

														const displayName =
															item.count > 1
																? `${baseName} (x${item.count})`
																: baseName;
														return (
															<XStack
																key={`${cat.categoryName}-${item.name}-${item.isReal}`}
																justifyContent="space-between"
																paddingLeft="$3"
																marginTop="$1"
															>
																<SizableText
																	size="$3"
																	color="$color11"
																>
																	{displayName}
																</SizableText>
																<SizableText
																	size="$3"
																	color="$color11"
																>
																	{`${Math.abs(item.amount).toFixed(2)} €`}
																</SizableText>
															</XStack>
														);
													},
												)}
											</YStack>
										))}
									</YStack>
								)}
							</Card>
						)}
					</YStack>
				</YStack>
			</ScrollView>
		</YStack>
	);
}
