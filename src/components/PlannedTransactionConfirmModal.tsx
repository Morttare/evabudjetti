import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
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
	const { t } = useTranslation();
	const categories = useCategoryStore((state) => state.categories);
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

	const filteredCategories = useMemo(
		() => categories.filter((cat) => cat.type === occurrence.type),
		[categories, occurrence.type],
	);

	useEffect(() => {
		const hasSelected = filteredCategories.some(
			(cat) => cat.id === selectedCategory,
		);
		if (!hasSelected) setSelectedCategory(0);
	}, [filteredCategories, selectedCategory]);

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
			<YStack backgroundColor="$background" style={styles.card}>
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
						{filteredCategories.length > 0 && (
							<YStack gap={8}>
								<SizableText color="$primary100" size="$title3">
									{t('Category')}
								</SizableText>
								<XStack flexWrap="wrap">
									{filteredCategories.map(
										({ id, name: label }) => (
											<Button
												key={id}
												onPress={() =>
													setSelectedCategory(id)
												}
												size={28}
												padding={14}
												marginRight={8}
												marginBottom={8}
												backgroundColor={
													id === selectedCategory
														? '$primary200'
														: '$white'
												}
											>
												<SizableText size="$title3">
													{label}
												</SizableText>
											</Button>
										),
									)}
								</XStack>
							</YStack>
						)}
					</YStack>
				</ScrollView>

				<XStack justifyContent="space-between" marginTop={20}>
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
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
	},
	card: {
		width: '90%',
		maxHeight: '80%',
		padding: 20,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '$black',
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
