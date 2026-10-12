import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { addMonths } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Keyboard,
	StyleSheet,
	TouchableWithoutFeedback,
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
} from '../dataModel';
import { DEFAULT_ACCOUNT_ID } from '../dataModel';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';

type AddItemPopupProps = {
	item: Persisted<PlannedTransaction> | PlannedTransaction | null;
	onSave: (item: PlannedTransaction) => Promise<unknown>;
	onDelete: () => Promise<void>;
	onClose: () => void;
};

const AddItemPopup = ({
	item,
	onSave,
	onDelete,
	onClose,
}: AddItemPopupProps) => {
	const REOCCURENCE_OPTIONS: RecurrenceBase[] = [
		'day',
		'week',
		'month',
		'year',
	];
	const { t } = useTranslation();
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
			categoryId: 0,
			name: name.trim(),
			amount: amount,
			recurrenceBase: reoccurence,
			startDate: startDate,
			endDate: endDate,
			recurrenceInterval: reoccurenceInterval,
		} as PlannedTransaction);

		onClose();
	};
	const handleDelete = async () => {
		if (item !== null) await onDelete();
		onClose();
	};
	return (
		<View style={styles.container}>
			<TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
				<YStack backgroundColor="$background" style={styles.card}>
					<XStack justifyContent="space-between">
						<SizableText color="$primary100" size="$title2">
							{item !== null
								? t('Edit item')
								: t('Add a new item')}
						</SizableText>
						{item !== null && (
							<Button
								onPress={handleDelete}
								color="$white"
								backgroundColor="$danger500"
								height="100%"
							>
								{t('Delete')}
							</Button>
						)}
					</XStack>
					<View style={styles.inputsContainer}>
						<View style={styles.singleItemContainer}>
							<SizableText color="$primary100" size="$title3">
								{t('Name')}
							</SizableText>
							<Input
								color="$primary100"
								placeholder={t('Write the name here')}
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
						<View>
							<XStack
								style={{
									alignItems: 'center',
									gap: 5,
									marginTop: '-8%',
									marginBottom: 5,
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
										height: '60%',
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
												height: '100%',
											}}
											defaultValue={String(
												item
													? item.recurrenceInterval
													: 1,
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
													borderWidth={
														recSelect ? 2 : 1
													}
													borderBottomLeftRadius={
														recSelect ? 0 : 15
													}
													borderBottomRightRadius={
														recSelect ? 0 : 15
													}
													iconAfter={ChevronDown}
													onPressOut={() =>
														recSelect
															? toggleRecSelect(
																	false,
																)
															: toggleRecSelect(
																	true,
																)
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
																		index={
																			i
																		}
																		key={
																			opt
																		}
																		value={
																			opt
																		}
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
								<View style={styles.singleItemContainer}>
									<XStack
										style={{
											alignItems: 'center',
											gap: 5,
											marginTop: '-35%',
											marginBottom: '-25%',
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
					</View>
					<View style={styles.buttonRow}>
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
						<Button
							borderRadius={28}
							backgroundColor="$caution"
							style={styles.button}
							onPress={onClose}
						>
							<SizableText color="$primary100" size="$title3">
								{t('Cancel')}
							</SizableText>
						</Button>
					</View>
				</YStack>
			</TouchableWithoutFeedback>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	singleItemContainer: {
		height: '13%',
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
		height: '70%',
	},
	input: {
		height: '100%',
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		height: '10%',
	},
	inputsContainer: {
		gap: 30,
		marginVertical: 20,
		height: '75%',
	},
	button: {
		width: '45%',
		height: '100%',
	},
	calendarIcon: {
		width: '10%',
		height: '100%',
	},
});

export default AddItemPopup;
