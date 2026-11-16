import { Check, ChevronDown, Plus, Trash2 } from '@tamagui/lucide-icons';
import { addMonths } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Keyboard,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';
import {
	Button,
	Checkbox,
	Input,
	Select,
	SizableText,
	Text,
	XStack,
	YStack,
} from 'tamagui';
import type {
	Persisted,
	PlannedTransaction,
	RecurrenceBase,
	TransactionType,
} from '../dataModel';
import { DEFAULT_ACCOUNT_ID } from '../dataModel';
import { useCategoryStore } from '../store/categoryStore';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';

type AddItemPopupProps = {
	item: Persisted<PlannedTransaction> | PlannedTransaction | null;
	onSave: (item: PlannedTransaction) => Promise<unknown>;
	onDelete: () => Promise<void>;
	onClose: () => void;
	transactionType: TransactionType;
};

const AddItemPopup = ({
	item,
	onSave,
	onDelete,
	onClose,
	transactionType,
}: AddItemPopupProps) => {
	const REOCCURENCE_OPTIONS: RecurrenceBase[] = [
		'day',
		'week',
		'month',
		'year',
	];
	const { t } = useTranslation();
	const categories = useCategoryStore((state) => state.categories);
	const addCategory = useCategoryStore((state) => state.addCategory);
	const transactionCategories = categories.filter(
		(category) => category.type === transactionType,
	);
	const [recSelect, toggleRecSelect] = useState<true | false>(false);
	const [name, setName] = useState<string>(item ? item.name : '');
	const [amount, setAmount] = useState<number | null>(
		item ? item.amount : null,
	);
	const [startDate, setStartDate] = useState<Date>(
		item ? item.startDate : new Date(),
	);
	const [endDate, setEndDate] = useState<Date | null>(
		item ? item.endDate : null,
	);
	const [reoccurence, setReoccurence] = useState<RecurrenceBase | null>(
		item ? item.recurrenceBase : null,
	);
	const [reoccurenceInterval, setReoccurenceInterval] = useState<number>(
		item ? item.recurrenceInterval : 1,
	);
	const [categoryId, setCategoryId] = useState(item?.categoryId ?? 0);
	const [categoryModalVisible, setCategoryModalVisible] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [categoryError, setCategoryError] = useState<string | null>(null);

	const isDisabled =
		!name.trim() ||
		Number.isNaN(Number(amount)) ||
		Number(amount) <= 0 ||
		!startDate ||
		reoccurenceInterval <= 0;
	const hasEndDate = endDate !== null;
	const hasReocurrence = reoccurence !== null;
	const handleAdd = async () => {
		await onSave({
			...(item !== null && 'id' in item ? { id: item.id } : {}),
			accountId: DEFAULT_ACCOUNT_ID,
			categoryId,
			name: name.trim(),
			amount: amount,
			type: transactionType,
			recurrenceBase: reoccurence,
			startDate: startDate,
			endDate: endDate,
			recurrenceInterval: reoccurenceInterval,
		} as PlannedTransaction);

		onClose();
	};
	const handleAddCategory = async () => {
		const trimmedName = newCategoryName.trim();
		if (!trimmedName) return;

		try {
			const createdCategory = await addCategory({
				name: trimmedName,
				type: transactionType,
				color: '#000000',
				icon: 'circle',
			});
			setCategoryId(createdCategory.id);
			setNewCategoryName('');
			setCategoryError(null);
			setCategoryModalVisible(false);
		} catch (error) {
			console.error('Failed to add category:', error);
			setCategoryError(t('Failed to save changes'));
		}
	};
	const handleDelete = async () => {
		if (item !== null) await onDelete();
		onClose();
	};
	return (
		<View style={styles.container}>
			<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
			<YStack
				backgroundColor="$background"
				borderColor="$primary100"
				borderWidth={2}
				borderRadius={16}
				shadowColor="$black"
				shadowOffset={{ width: 0, height: 5 }}
				shadowOpacity={0.3}
				shadowRadius={10}
				elevation={12}
				style={styles.card}
			>
				<XStack justifyContent="space-between">
					<SizableText color="$primary100" size="$title1">
						{item !== null ? t('Edit item') : t('Add a new item')}
					</SizableText>
					{item !== null && (
						<Button
							size="$buttons.lg"
							circular
							backgroundColor="$danger500"
							color="$white"
							icon={Trash2}
							onPress={handleDelete}
							/*
								color="$white"
								backgroundColor="$danger500"
								height="100%" */
						></Button>
					)}
				</XStack>
				<ScrollView
					style={styles.inputsContainer}
					contentContainerStyle={styles.inputsContent}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
					onScrollBeginDrag={Keyboard.dismiss}
				>
					<View style={styles.singleItemContainer}>
						<SizableText color="$primary100" size="$title3">
							{t('Name')}
						</SizableText>
						<Input
							color="$primary100"
							placeholder={t('Write the name here')}
							placeholderTextColor="#a3a3a3"
							style={styles.input}
							value={name}
							onChangeText={setName}
						/>
					</View>
					<View style={styles.singleItemContainer}>
						<SizableText color="$primary100" size="$title3">
							{t('Amount')}
						</SizableText>
						<Input
							color="$primary100"
							placeholder={t('Write the amount here (€)')}
							placeholderTextColor="#a3a3a3"
							style={styles.input}
							maxLength={12}
							defaultValue={amount ? String(amount) : null}
							keyboardType="numeric"
							onChangeText={(text: string) => {
								text = `${text.replace(',', '.')}`;
								const input = Number(text);
								if (!Number.isNaN(input) && input >= 0) {
									setAmount(input);
								} else {
									setAmount(null);
								}
							}}
						/>
					</View>
					<View style={styles.categoryContainer}>
						<SizableText color="$primary100" size="$title3">
							{t('Category')}
						</SizableText>
						<XStack flexWrap="wrap">
							<Button
								onPress={() => {
									setCategoryError(null);
									setCategoryModalVisible(true);
								}}
								icon={Plus}
								size={40}
								marginRight={8}
								marginBottom={8}
								borderWidth={1}
								borderColor="$primary200"
								backgroundColor="$white"
							/>
							{[
								{
									id: 0,
									name: t('Uncategorized default'),
								},
								...transactionCategories
									.filter((category) => category.id !== 0)
									.map((category) => ({
										id: category.id,
										name: category.name,
									})),
							].map((category) => {
								const selected = category.id === categoryId;
								return (
									<Button
										key={category.id}
										onPress={() =>
											setCategoryId(category.id)
										}
										size={40}
										paddingHorizontal={14}
										marginRight={8}
										marginBottom={8}
										borderWidth={1}
										borderColor="$primary200"
										backgroundColor={
											selected ? '$primary300' : '$white'
										}
									>
										<SizableText
											color="$primary100"
											size="$title3"
										>
											{category.name}
										</SizableText>
									</Button>
								);
							})}
						</XStack>
					</View>
					<View style={styles.singleItemContainer}>
						<SizableText color="$primary100" size="$title3">
							{t('Start Date')}:
						</SizableText>
						<MultiPlatformDatePicker
							value={startDate}
							color="primary100"
							onChange={setStartDate}
						/>
					</View>
					<View style={styles.recurrenceContainer}>
						<XStack
							style={{
								alignItems: 'center',
								gap: 8,
							}}
						>
							<SizableText color="$primary100" size="$title3">
								{t('Reoccurrence')}:
							</SizableText>
							<Checkbox
								checked={hasReocurrence}
								onCheckedChange={() => {
									if (hasReocurrence) {
										setReoccurence(null);
										setEndDate(null);
									} else {
										setReoccurence(
											item?.recurrenceBase
												? item.recurrenceBase
												: 'month',
										);
									}
								}}
								size="$10"
							>
								<Checkbox.Indicator>
									<Check />
								</Checkbox.Indicator>
							</Checkbox>
						</XStack>
						{hasReocurrence && (
							<YStack
								style={{
									flexDirection: 'row',
									gap: 8,
									alignItems: 'center',
									width: '100%',
									flexWrap: 'wrap',
								}}
							>
								<XStack gap={5} alignItems="unset">
									<Input
										color="$primary100"
										textAlign="center"
										maxLength={3}
										borderColor={'$primary100'}
										style={{
											minWidth: '21%',
											height: 45,
										}}
										defaultValue={String(
											item ? item.recurrenceInterval : 1,
										)}
										keyboardType="numeric"
										onChangeText={(text: string) => {
											const interval = Number(text);
											interval > 0 &&
											!Number.isNaN(interval)
												? setReoccurenceInterval(
														Number(interval),
													)
												: setReoccurenceInterval(0);
										}}
									/>
									<View>
										<Select
											disablePreventBodyScroll
											native="web"
											defaultValue={
												reoccurence
													? reoccurence
													: 'month'
											}
										>
											<Select.Trigger
												borderColor={'$primary100'}
												height={'45'}
												/* Border style changes when selection is active */
												borderWidth={recSelect ? 2 : 1}
												borderBottomLeftRadius={
													recSelect ? 0 : 15
												}
												borderBottomRightRadius={
													recSelect ? 0 : 15
												}
												iconAfter={ChevronDown}
												onPressOut={() =>
													recSelect
														? toggleRecSelect(false)
														: toggleRecSelect(true)
												}
											>
												<Select.Value
													color={'$primary100'}
												/>
											</Select.Trigger>

											<Select.Content>
												<Select.Viewport>
													<Select.Group>
														{REOCCURENCE_OPTIONS.map(
															(opt, i) => (
																<Select.Item
																	/* Manually hide and disable the dropdown menu when necessary.
																	This is not optimal and should probably be changed at some point*/
																	opacity={
																		recSelect
																			? 100
																			: 0
																	}
																	disabled={
																		!recSelect
																	}
																	zIndex={
																		recSelect
																			? 2000
																			: 0
																	}
																	borderColor={
																		'$primary100'
																	}
																	borderWidth={
																		2
																	}
																	borderTopWidth={
																		0
																	}
																	borderBottomWidth={
																		i ===
																		REOCCURENCE_OPTIONS.length -
																			1
																			? 2
																			: 0
																	}
																	alignSelf="center"
																	marginTop={
																		-0.5
																	}
																	index={i}
																	key={opt}
																	value={opt}
																	onTouchEnd={() => {
																		setReoccurence(
																			opt,
																		);
																		toggleRecSelect(
																			false,
																		);
																	}}
																>
																	<Select.ItemText
																		color={
																			'$primary100'
																		}
																		alignContent="center"
																	>
																		{t(
																			'Rec_' +
																				opt,
																		)}
																	</Select.ItemText>
																	<Select.ItemIndicator marginLeft="10">
																		<Check
																			size={
																				16
																			}
																		/>
																	</Select.ItemIndicator>
																</Select.Item>
															),
														)}
													</Select.Group>
												</Select.Viewport>
											</Select.Content>
										</Select>
									</View>

									<Text
										color="$primary100"
										fontWeight={'bold'}
										paddingVertical={10}
									>
										{t('Interval')}
									</Text>
								</XStack>
							</YStack>
						)}
						{hasReocurrence && (
							<View style={styles.endDateContainer}>
								<XStack
									style={{
										alignItems: 'center',
										gap: 8,
									}}
								>
									<SizableText
										style={{ height: '100%' }}
										color="$primary100"
										size="$title3"
									>
										{t('End Date')}:
									</SizableText>
									<Checkbox
										checked={hasEndDate}
										onCheckedChange={() =>
											hasEndDate
												? setEndDate(null)
												: setEndDate(
														item?.endDate
															? item.endDate
															: addMonths(
																	new Date(),
																	1,
																),
													)
										}
										// Default end date should change based on interval?
										size="$10"
									>
										<Checkbox.Indicator>
											<Check />
										</Checkbox.Indicator>
									</Checkbox>
								</XStack>
								{hasEndDate && (
									<MultiPlatformDatePicker
										value={endDate}
										color="primary100"
										onChange={setEndDate}
									/>
								)}
							</View>
						)}
					</View>
				</ScrollView>
				<View style={styles.buttonRow}>
					<Button
						borderRadius={28}
						borderColor="$primary200"
						backgroundColor="transparent"
						style={styles.button}
						onPress={onClose}
					>
						<SizableText color="$primary100" size="$title3">
							{t('Cancel')}
						</SizableText>
					</Button>
					<Button
						borderRadius={28}
						backgroundColor={
							isDisabled ? '$primary300' : '$primary200'
						}
						style={styles.button}
						onPress={handleAdd}
						disabled={isDisabled}
					>
						<SizableText color="$white" size="$title3">
							{item !== null ? t('Save') : t('Add')}
						</SizableText>
					</Button>
				</View>
			</YStack>
			{categoryModalVisible && (
				<View style={styles.categoryOverlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => setCategoryModalVisible(false)}
					/>
					<YStack
						backgroundColor="$white"
						borderColor="$primary100"
						borderWidth={2}
						borderRadius={16}
						padding={24}
						width="85%"
						gap={16}
					>
						<SizableText color="$primary100" size="$title1">
							{t('Add category')}
						</SizableText>
						<Input
							color="$primary100"
							value={newCategoryName}
							onChangeText={setNewCategoryName}
							placeholder={t('Enter category')}
							placeholderTextColor="#a3a3a3"
							height={40}
							borderRadius={6}
							px="10px"
							fontSize="$title3"
						/>
						{categoryError && (
							<SizableText color="$danger500">
								{categoryError}
							</SizableText>
						)}
						<XStack width="100%" justifyContent="space-between">
							<Button
								borderRadius={28}
								borderColor="$primary200"
								backgroundColor="transparent"
								style={styles.button}
								onPress={() => {
									setNewCategoryName('');
									setCategoryError(null);
									setCategoryModalVisible(false);
								}}
							>
								<SizableText color="$primary100" size="$title3">
									{t('Cancel')}
								</SizableText>
							</Button>
							<Button
								borderRadius={28}
								backgroundColor="$primary200"
								style={styles.button}
								disabled={!newCategoryName.trim()}
								onPress={() => {
									void handleAddCategory();
								}}
							>
								<SizableText color="$white" size="$title3">
									{t('Save')}
								</SizableText>
							</Button>
						</XStack>
					</YStack>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
	},
	singleItemContainer: {
		gap: 8,
	},
	dateInput: {
		height: '60%',
		width: '30%',
	},
	dateContainer: {
		flexDirection: 'row',
		height: '20%',
		alignItems: 'center',
		gap: 20,
	},
	card: {
		width: '90%',
		padding: 20,
		height: '85%',
		maxHeight: '90%',
	},
	input: {
		height: 45,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		height: 50,
	},
	inputsContainer: {
		flex: 1,
		marginVertical: 16,
	},
	inputsContent: {
		gap: 8,
		paddingBottom: 16,
	},
	categoryContainer: {
		gap: 8,
	},
	recurrenceContainer: {
		gap: 4,
	},
	endDateContainer: {
		gap: 8,
	},
	categoryOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		zIndex: 10,
	},
	button: {
		width: '45%',
		height: 50,
	},
	calendarIcon: {
		width: '10%',
		height: '100%',
	},
});

export default AddItemPopup;
