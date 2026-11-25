import { Plus } from '@tamagui/lucide-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
	Button,
	Input,
	ScrollView,
	SizableText,
	XStack,
	YStack,
} from 'tamagui';
import {
	DEFAULT_ACCOUNT_ID,
	type Persisted,
	type RealTransaction,
	type TransactionOccurrence,
} from '../dataModel';
import { useAddRealTransaction } from '../finance/hook/useAddRealTransaction';
import { useUpdateRealTransaction } from '../finance/hook/useUpdateRealTransaction';
import { useCategoryStore } from '../store/categoryStore';
import { getCategoryDisplayName } from '../utils/categoryName';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';

type PlannedTransactionConfirmModalProps = {
	occurrence: TransactionOccurrence;
	onClose: () => void;
	onConfirmed: () => void;
};

const PlannedTransactionConfirmModal = ({
	occurrence,
	onClose,
	onConfirmed,
}: PlannedTransactionConfirmModalProps) => {
	const { t, i18n } = useTranslation();
	const categories = useCategoryStore((state) => state.categories);
	const addCategory = useCategoryStore((state) => state.addCategory);
	const addRealTransaction = useAddRealTransaction();
	const updateRealTransaction = useUpdateRealTransaction();

	const [name, setName] = useState(occurrence.name);
	const [amount, setAmount] = useState(
		(occurrence.realTransaction?.amount ?? occurrence.amount).toString(),
	);
	const [date, setDate] = useState<Date>(new Date(occurrence.date));
	const [selectedCategory, setSelectedCategory] = useState<number>(
		occurrence.realTransaction?.categoryId ?? occurrence.categoryId,
	);
	const [saving, setSaving] = useState(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
	const [categoryModalVisible, setCategoryModalVisible] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [categoryError, setCategoryError] = useState<string | null>(null);

	const filteredCategories = useMemo(
		() => categories.filter((cat) => cat.type === occurrence.type),
		[categories, occurrence.type],
	);
	const displayCategories = useMemo(
		() => [
			{ id: 0, name: t('Uncategorized default') },
			...filteredCategories.filter((category) => category.id !== 0),
		],
		[filteredCategories, t],
	);

	useEffect(() => {
		const hasSelected = displayCategories.some(
			(category) => category.id === selectedCategory,
		);
		if (!hasSelected) setSelectedCategory(0);
	}, [displayCategories, selectedCategory]);

	const handleAddCategory = async () => {
		const categoryName = newCategoryName.trim();
		if (!categoryName) return;

		try {
			const createdCategory = await addCategory({
				name: categoryName,
				type: occurrence.type,
				color: '#000000',
				icon: 'circle',
			});
			setSelectedCategory(createdCategory.id);
			setNewCategoryName('');
			setCategoryError(null);
			setCategoryModalVisible(false);
		} catch (error) {
			console.error('Failed to add category:', error);
			setCategoryError(t('Failed to save changes'));
		}
	};

	const handleAmountChange = (text: string) => {
		const numeric = text.replace(/[^0-9.,]/g, '');
		const dotted = numeric.replace(',', '.');
		const parts = dotted.split('.');
		if (parts.length === 1) {
			setAmount(parts[0]);
		} else {
			const integer = parts[0];
			const decimal = parts.slice(1).join('').slice(0, 2);
			setAmount(`${integer}.${decimal}`);
		}
	};

	const isDisabled =
		saving ||
		!name.trim() ||
		!amount ||
		Number.parseFloat(amount) <= 0 ||
		!date;

	const handleConfirm = async () => {
		const numAmount = Number.parseFloat(amount);
		if (isDisabled || Number.isNaN(numAmount)) return;

		setSaving(true);
		try {
			const existing = occurrence.realTransaction as
				| Persisted<RealTransaction>
				| undefined;
			if (existing != null) {
				await updateRealTransaction(existing, {
					...existing,
					name: name.trim(),
					amount: numAmount,
					date,
					categoryId: selectedCategory,
				});
			} else {
				await addRealTransaction({
					accountId: DEFAULT_ACCOUNT_ID,
					name: name.trim(),
					amount: numAmount,
					date,
					type: occurrence.type,
					categoryId: selectedCategory,
					plannedTransactionId:
						occurrence.plannedTransaction?.id ?? null,
					// Preserve the scheduled date separately if the user moves this occurrence.
					plannedOccurrenceDate: occurrence.plannedTransaction
						? occurrence.date
						: null,
				});
			}
			onConfirmed();
		} catch (e) {
			console.error('Failed to confirm planned transaction:', e);
			setFeedbackMessage(t('Failed to save changes'));
		} finally {
			setSaving(false);
		}
	};

	const isEdit = occurrence.realTransaction != null;

	return (
		<View style={styles.container}>
			<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

			<YStack
				backgroundColor="$background"
				style={styles.card}
				borderWidth={2}
				borderColor="$primary100"
				shadowColor="$black"
				shadowOffset={{ width: 0, height: 5 }}
				shadowOpacity={0.3}
				shadowRadius={10}
				elevation={12}
			>
				<XStack
					justifyContent="space-between"
					alignItems="center"
					marginBottom={8}
				>
					<SizableText color="$primary100" size="$title1">
						{isEdit
							? t('Edit confirmed transaction')
							: t('Confirm budgeted transaction')}
					</SizableText>
				</XStack>

				{/* Budgeted amount reference */}
				<SizableText color="$gray700" size="$5" marginBottom={8}>
					{t('Budgeted amount line', { amount: occurrence.amount })}
				</SizableText>

				{feedbackMessage && (
					<SizableText color="$caution" size="$2" marginBottom={8}>
						{feedbackMessage}
					</SizableText>
				)}

				<ScrollView style={styles.scrollContainer}>
					<YStack gap={20} paddingVertical={20}>
						{/* Name */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title2">
								{t('Name')}
							</SizableText>
							<Input
								color="$primary100"
								value={name}
								onChangeText={setName}
								placeholder={t('Enter transaction name')}
								placeholderTextColor="#a3a3a3"
								height={40}
								borderRadius={6}
								px="10px"
								fontSize="$title3"
								focusStyle={{ outlineColor: 'transparent' }}
							/>
						</YStack>

						{/* Amount */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title2">
								{t('Amount')}
							</SizableText>
							<Input
								color="$primary100"
								value={amount}
								onChangeText={handleAmountChange}
								keyboardType="decimal-pad"
								placeholder={t('Enter amount (€)')}
								placeholderTextColor="#a3a3a3"
								height={40}
								borderRadius={6}
								px="10px"
								fontSize="$title3"
								focusStyle={{ outlineColor: 'transparent' }}
							/>
						</YStack>

						{/* Date */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title2">
								{t('Date')}
							</SizableText>
							<MultiPlatformDatePicker
								value={date}
								color="primary100"
								onChange={setDate}
							/>
						</YStack>

						{/* Category */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title2">
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
								{displayCategories.map(({ id, name }) => {
									const selected = id === selectedCategory;
									return (
										<Button
											key={id}
											onPress={() =>
												setSelectedCategory(id)
											}
											size={40}
											paddingHorizontal={14}
											marginRight={8}
											marginBottom={8}
											borderWidth={1}
											borderColor="$primary200"
											backgroundColor={
												selected
													? '$primary300'
													: '$white'
											}
										>
											<SizableText
												color="$primary100"
												size="$title3"
											>
												{id === 0
													? name
													: getCategoryDisplayName(
															name,
															i18n.language,
														)}
											</SizableText>
										</Button>
									);
								})}
							</XStack>
						</YStack>
					</YStack>
				</ScrollView>

				<XStack
					width="100%"
					justifyContent="space-between"
					marginTop={20}
				>
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
						onPress={() => {
							void handleConfirm();
						}}
						disabled={isDisabled}
					>
						<SizableText color="$white" size="$title3">
							{isEdit ? t('Save') : t('Confirm')}
						</SizableText>
					</Button>
				</XStack>
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
						shadowColor="$black"
						shadowOffset={{ width: 0, height: 5 }}
						shadowOpacity={0.3}
						shadowRadius={10}
						elevation={12}
						padding={24}
						width="90%"
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
							focusStyle={{ outlineColor: 'transparent' }}
						/>
						{categoryError && (
							<SizableText color="$danger500">
								{categoryError}
							</SizableText>
						)}
						<XStack width="100%" justifyContent="space-between">
							<Button
								borderColor="$primary200"
								backgroundColor="transparent"
								borderRadius={28}
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
								backgroundColor="$primary200"
								borderRadius={28}
								style={styles.button}
								disabled={!newCategoryName.trim()}
								onPress={() => {
									void handleAddCategory();
								}}
							>
								<SizableText color="$white" size="$title3">
									{t('Add')}
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
	categoryOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		zIndex: 10,
	},
	card: {
		width: '90%',
		maxHeight: '80%',
		padding: 20,
		borderRadius: 16,
	},
	scrollContainer: {
		flexGrow: 1,
	},
	button: {
		width: '45%',
		height: 50,
	},
});

export default PlannedTransactionConfirmModal;
