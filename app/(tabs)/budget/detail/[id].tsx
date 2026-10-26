import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Button, Card, Separator, SizableText, XStack, YStack } from 'tamagui';
import { usePlannedTransactions } from '@/src/finance/hook/usePlannedTransactions';
import { getTransactionOccurrenceCount } from '@/src/finance/logic/util';

type ProcessedItem = {
	id: number;
	name: string;
	count: number;
	totalAmount: number;
};

export default function BudgetDetailedMonthScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [expensesExpanded, setExpensesExpanded] = useState(false);
	const [incomeExpanded, setIncomeExpanded] = useState(false);
	const { t } = useTranslation();

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
	const formattedTitle = `${translatedMonth} ${yearNum} (${t('Budget')})`;

	const plannedTransactions = usePlannedTransactions();

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
						const categoryName = !Number(categoryId)
							? t('Uncategorized')
							: `${t('Category')} ${categoryId}`;

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
		}, [plannedTransactions, yearNum, monthNum, t]);

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
								{t('Planned Expenses')}
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
										{t('No expenses planned')}
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

												{cat.items.map((item) => (
													<XStack
														key={`expense-${item.id}`}
														justifyContent="space-between"
														paddingLeft="$3"
														marginTop="$1"
													>
														<SizableText
															size="$3"
															color="$color11"
														>
															{item.name}
														</SizableText>
														<SizableText
															size="$3"
															color="$color11"
														>
															{`${Math.abs(item.totalAmount).toFixed(2)} €`}
														</SizableText>
													</XStack>
												))}
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
							{t('Planned Incomes')}
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
										{t('No income planned')}
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

												{cat.items.map((item) => (
													<XStack
														key={`expense-${item.id}`}
														justifyContent="space-between"
														paddingLeft="$3"
														marginTop="$1"
													>
														<SizableText
															size="$3"
															color="$color11"
														>
															{item.name}
														</SizableText>
														<SizableText
															size="$3"
															color="$color11"
														>
															{`${Math.abs(item.totalAmount).toFixed(2)} €`}
														</SizableText>
													</XStack>
												))}
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
