import { Check, ChevronDown, Plus } from '@tamagui/lucide-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
	Button,
	Input,
	Progress,
	Select,
	SizableText,
	View as TamaguiView,
	XStack,
	YStack,
} from 'tamagui';
import BudgetWizardItem from '@/src/components/BudgetWizardItem';
import { MultiPlatformDatePicker } from '@/src/components/MultiPlatformDatePicker';
import type { Persisted, PlannedTransaction } from '@/src/dataModel';
import { useAddPlannedTransaction } from '@/src/finance/hook/useAddPlannedTransaction';
import { useDeletePlannedTransaction } from '@/src/finance/hook/useDeletePlannedTransaction';
import { useInvalidateFinanceCaches } from '@/src/finance/hook/useInvalidateFinanceCaches';
import { usePlannedTransactions } from '@/src/finance/hook/usePlannedTransactions';
import { useUpdatePlannedTransaction } from '@/src/finance/hook/useUpdatePlannedTransaction';
import { suggestTimeframe } from '@/src/finance/logic/timeframeSuggestion';
import { useTimeframeDraft } from '@/src/store/useTimeframeDraft';
import type { LengthOptions } from '@/src/store/useTimeframeStore';
import AddItemPopup from '../src/components/AddItemPopup';
import {
	BUDGET_WIZARD_STEPS,
	type BudgetWizardStep,
} from '../src/constants/wizardConfig';

const TIMEFRAME_LENGTH_OPTIONS: readonly LengthOptions[] = [
	'days',
	'weeks',
	'months',
	'years',
];

const isLengthOption = (value: string): value is LengthOptions =>
	TIMEFRAME_LENGTH_OPTIONS.some((option) => option === value);

export default function BudgetWizard() {
	const { t } = useTranslation();
	const router = useRouter();
	const transactions = usePlannedTransactions();
	const addPlannedTransaction = useAddPlannedTransaction();
	const updatePlannedTransaction = useUpdatePlannedTransaction();
	const deletePlannedTransactionHook = useDeletePlannedTransaction();
	const invalidateFinanceCaches = useInvalidateFinanceCaches();
	const timeframeDraft = useTimeframeDraft();
	const timeframeSuggestion = suggestTimeframe(transactions);

	const [stepIndex, setStepIndex] = useState(0);
	const [wizardData, setWizardData] =
		useState<BudgetWizardStep[]>(BUDGET_WIZARD_STEPS);
	useEffect(() => {
		setWizardData((prev) =>
			prev.map((step) => ({
				...step,
				items:
					step.header === 'Incomes'
						? transactions.filter((t) => t.type === 'income')
						: transactions.filter((t) => t.type === 'expense'),
			})),
		);
	}, [transactions]);
	const [popupVisible, setPopupVisible] = useState(false);
	const [selectOpen, setSelectOpen] = useState(false);
	const currentStep = wizardData[stepIndex];
	const progressBarValue = ((stepIndex + 1) * 100) / wizardData.length;

	type BudgetListItem = { index: number; item: PlannedTransaction };
	const [selectedItem, setSelectedItem] = useState<BudgetListItem | null>(
		null,
	);

	async function addItem(newItem: PlannedTransaction) {
		newItem.type = currentStep.header === 'Incomes' ? 'income' : 'expense';
		newItem.categoryId = 0;
		await addPlannedTransaction(newItem);
	}

	async function editItem(
		original: Persisted<PlannedTransaction>,
		edited: Persisted<PlannedTransaction>,
	) {
		await updatePlannedTransaction(original, edited);
	}

	async function deleteItem() {
		if (selectedItem) {
			const item = selectedItem.item as Persisted<PlannedTransaction>;
			await deletePlannedTransactionHook(item);
		}
	}

	const closePopUp = () => {
		setSelectedItem(null);
		setPopupVisible(false);
	};

	const handleFinish = () => {
		timeframeDraft.save();
		invalidateFinanceCaches();
		router.push('/');
	};

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<View style={styles.container}>
				{/* -- Add Item PopUp -- */}
				<Modal
					visible={popupVisible}
					onRequestClose={() => closePopUp()}
					transparent={true}
				>
					<AddItemPopup
						item={selectedItem ? selectedItem.item : null}
						onSave={
							selectedItem === null
								? (item) => addItem(item)
								: (item) =>
										editItem(
											selectedItem.item as Persisted<PlannedTransaction>,
											item as Persisted<PlannedTransaction>,
										)
						}
						onDelete={() => deleteItem()}
						onClose={() => closePopUp()}
					/>
				</Modal>

				<View style={styles.topContent}>
					<Progress
						backgroundColor="$white"
						style={styles.progressBar}
						value={progressBarValue}
					>
						<Progress.Indicator
							backgroundColor="$primary200"
							animation="bouncy"
						/>
					</Progress>
					<SizableText
						color="$primary100"
						style={styles.pageHeader}
						size="$title1"
					>
						{t('Create budget')}
					</SizableText>
					<SizableText
						color="$primary100"
						style={styles.stepHeader}
						size="$title2"
					>
						{t(currentStep.header)}
					</SizableText>
				</View>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					style={styles.content}
				>
					{currentStep.header === 'Timeframe' ? (
						<YStack gap="$3" padding="$3">
							<SizableText color="$gray700">
								{t('Timeframe info')}
							</SizableText>
							<SizableText color="$gray700">
								{t('Timeframe start info')}
							</SizableText>
							<XStack alignItems="center" gap="$2">
								<SizableText color="$gray700">
									{t('Start date')} *
								</SizableText>
								<MultiPlatformDatePicker
									value={timeframeDraft.startDate}
									color="primary100"
									onChange={timeframeDraft.setStartDate}
								/>
							</XStack>
							<SizableText color="$gray700">
								{t('Timeframe length info')}
							</SizableText>
							<SizableText color="$gray700">
								{t('Timeframe length')}
							</SizableText>
							<XStack gap="$2" alignItems="unset">
								<Input
									color="$black"
									borderColor="$black"
									textAlign="center"
									maxLength={3}
									value={timeframeDraft.lengthInput}
									onChangeText={timeframeDraft.setLengthInput}
									keyboardType="numeric"
									style={{
										minWidth: '21%',
										height: selectOpen ? '25%' : '100%',
									}}
								/>
								<View>
									<Select
										value={timeframeDraft.option}
										onValueChange={(option) => {
											if (isLengthOption(option)) {
												timeframeDraft.setOption(
													option,
												);
												setSelectOpen(false);
											}
										}}
										disablePreventBodyScroll
										native="web"
									>
										<Select.Trigger
											height={45}
											iconAfter={ChevronDown}
											borderColor="$black"
											borderWidth={selectOpen ? 2 : 1}
											borderBottomLeftRadius={
												selectOpen ? 0 : 15
											}
											borderBottomRightRadius={
												selectOpen ? 0 : 15
											}
											onPressOut={() =>
												setSelectOpen(!selectOpen)
											}
										>
											<Select.Value
												placeholder={t(
													timeframeDraft.option,
												)}
											/>
										</Select.Trigger>
										<Select.Content>
											<Select.Viewport>
												<Select.Group>
													<TamaguiView
														height={
															selectOpen
																? 'auto'
																: 0
														}
														overflow="hidden"
													>
														{TIMEFRAME_LENGTH_OPTIONS.map(
															(option, index) => (
																<Select.Item
																	index={
																		index
																	}
																	key={option}
																	value={
																		option
																	}
																	onTouchEnd={() => {
																		timeframeDraft.setOption(
																			option,
																		);
																		setSelectOpen(
																			false,
																		);
																	}}
																	borderColor="$black"
																	borderWidth={
																		1
																	}
																	borderTopWidth={
																		0
																	}
																	borderBottomWidth={
																		index ===
																		TIMEFRAME_LENGTH_OPTIONS.length -
																			1
																			? 1
																			: 0
																	}
																	borderBottomLeftRadius={
																		index ===
																		TIMEFRAME_LENGTH_OPTIONS.length -
																			1
																			? 15
																			: 0
																	}
																	borderBottomRightRadius={
																		index ===
																		TIMEFRAME_LENGTH_OPTIONS.length -
																			1
																			? 15
																			: 0
																	}
																>
																	<Select.ItemText>
																		{t(
																			option,
																		)}
																	</Select.ItemText>
																	<Select.ItemIndicator marginLeft="auto">
																		<Check
																			size={
																				16
																			}
																		/>
																	</Select.ItemIndicator>
																</Select.Item>
															),
														)}
													</TamaguiView>
												</Select.Group>
											</Select.Viewport>
										</Select.Content>
									</Select>
								</View>
							</XStack>
							{timeframeSuggestion && (
								<YStack gap="$2">
									<SizableText color="$gray700">
										{t('Timeframe suggestion', {
											name: timeframeSuggestion.basedOn
												.name,
											amount: `${timeframeSuggestion.basedOn.amount} €`,
											date: format(
												timeframeSuggestion.startDate,
												'dd.MM.yyyy',
											),
											length: timeframeSuggestion.length,
											unit: t(timeframeSuggestion.type),
										})}
									</SizableText>
									<Button
										borderRadius={40}
										height={50}
										backgroundColor="$primary200"
										onPress={() =>
											timeframeDraft.applySuggestion(
												timeframeSuggestion,
											)
										}
									>
										<SizableText color="$white">
											{t('Use suggestion')}
										</SizableText>
									</Button>
								</YStack>
							)}
							<SizableText color="$gray700">
								{t('Timeframe change info')}
							</SizableText>
						</YStack>
					) : (
						currentStep.items.map((item, index) => (
							<BudgetWizardItem
								item={item}
								onEdit={(it) => {
									setSelectedItem({ index, item: it });
									setPopupVisible(true);
								}}
								key={String(
									item.name + item.amount + item.startDate,
								)}
							/>
						))
					)}
					{/* Empty Y-stack to get margin after last budget item*/}
					<YStack marginTop="10" />
				</ScrollView>
				<View style={styles.addIconContainer}>
					<Button
						borderRadius={28}
						backgroundColor="$primary200"
						icon={Plus}
						color="$white"
						onPress={() => setPopupVisible(true)}
						style={styles.addIcon}
					/>
				</View>
				<View style={styles.buttonContainer}>
					<Button
						borderRadius={28}
						style={styles.footerButton}
						backgroundColor={
							stepIndex === 0 ? '$primary300' : '$primary200'
						}
						disabled={stepIndex === 0}
						onPress={() => setStepIndex(stepIndex - 1)}
					>
						<SizableText
							adjustsFontSizeToFit
							color="$white"
							size="$title1"
						>
							{t('Previous')}
						</SizableText>
					</Button>
					{stepIndex === wizardData.length - 1 ? (
						<Button
							borderRadius={28}
							style={styles.footerButton}
							backgroundColor="$primary200"
							onPress={handleFinish}
						>
							<SizableText color="$white" size="$title1">
								{t('Finish')}
							</SizableText>
						</Button>
					) : (
						<Button
							borderRadius={28}
							backgroundColor="$primary200"
							style={styles.footerButton}
							onPress={() => setStepIndex(stepIndex + 1)}
						>
							<SizableText
								adjustsFontSizeToFit
								color="$white"
								size="$title1"
							>
								{t('Next')}
							</SizableText>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	topContent: {
		height: '20%',
	},
	progressBar: {
		height: '20%',
	},
	container: {
		flexDirection: 'column',
		padding: 20,
		height: '100%',
	},
	dateContainer: {
		flexDirection: 'row',
		height: '20%',
		alignItems: 'center',
		gap: 20,
	},
	content: {
		flexDirection: 'column',
		marginTop: 5,
		height: '60%',
		borderTopWidth: 2,
		borderBottomWidth: 2,
	},
	itemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 5,
		marginTop: 5,
	},
	amountInput: {
		width: '28%',
		height: '100%',
	},
	dateInput: {
		height: '100%',
	},
	footerButton: {
		height: '100%',
		width: '42%',
	},
	buttonContainer: {
		height: '10%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 40,
	},
	itemContent: {
		width: '80%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 5,
	},
	calendarIcon: {
		width: '5%',
		height: '100%',
	},
	addIcon: {
		marginTop: 10,
		width: '23%',
		height: '100%',
	},
	addIconContainer: {
		alignItems: 'flex-end',
		height: '9%',
	},
	itemName: {
		width: '20%',
	},
	pencilIcon: {
		width: '1%',
		height: '100%',
	},
	pageHeader: {
		marginTop: 20,
	},
	stepHeader: {
		marginTop: 20,
	},
});
