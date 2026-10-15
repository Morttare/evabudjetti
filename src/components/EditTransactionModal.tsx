import { Trash2 } from '@tamagui/lucide-icons';
import { useState } from 'react';
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
import type { Persisted, RealTransaction } from '../dataModel';
import { useDeleteRealTransaction } from '../finance/hook/useDeleteRealTransaction';
import { useUpdateRealTransaction } from '../finance/hook/useUpdateRealTransaction';
import { useCategoryStore } from '../store/categoryStore';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';

type EditTransactionModalProps = {
	transaction: Persisted<RealTransaction>;
	onClose: () => void;
};

const EditTransactionModal = ({
	transaction,
	onClose,
}: EditTransactionModalProps) => {
	const { t } = useTranslation();
	const categories = useCategoryStore((state) => state.categories);
	const updateRealTransaction = useUpdateRealTransaction();
	const deleteRealTransaction = useDeleteRealTransaction();

	const [name, setName] = useState(transaction.name);
	const [amount, setAmount] = useState(transaction.amount.toString());
	const [date, setDate] = useState<Date>(new Date(transaction.date));
	const [selectedCategory, setSelectedCategory] = useState<number>(
		transaction.categoryId,
	);
	const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
	const [saving, setSaving] = useState(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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

	const handleSave = async () => {
		const numAmount = Number.parseFloat(amount);
		if (isDisabled || Number.isNaN(numAmount)) return;

		setSaving(true);
		try {
			await updateRealTransaction(transaction, {
				...transaction,
				name: name.trim(),
				amount: numAmount,
				date,
				categoryId: selectedCategory,
			});
			onClose();
		} catch (e) {
			console.error('Failed to update transaction:', e);
			setFeedbackMessage(t('Failed to save changes'));
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		setSaving(true);
		try {
			await deleteRealTransaction(transaction);
			onClose();
		} catch (e) {
			console.error('Failed to delete transaction:', e);
			setSaving(false);
			setFeedbackMessage(t('Failed to delete transaction'));
		}
	};

	const filteredCategories = categories.filter(
		(cat) => cat.type === transaction.type,
	);

	return (
		<View style={styles.container}>
			<YStack backgroundColor="$background" style={styles.card}>
				<XStack
					justifyContent="space-between"
					alignItems="center"
					marginBottom={8}
				>
					<SizableText color="$primary100" size="$title2">
						{t('Edit transaction')}
					</SizableText>
					<Button
						size="$buttons.sm"
						circular
						backgroundColor="$caution"
						icon={Trash2}
						onPress={() => setDeleteConfirmVisible(true)}
						disabled={saving}
					/>
				</XStack>

				<ScrollView style={styles.scrollContainer}>
					<YStack gap={20} paddingVertical={20}>
						{/* Name */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title3">
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
							<SizableText color="$primary100" size="$title3">
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
							<SizableText color="$primary100" size="$title3">
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

				{/* Action buttons */}
				<XStack justifyContent="space-between" marginTop={20}>
					<Button
						borderRadius={28}
						style={styles.button}
						borderColor="$primary200"
						backgroundColor="transparent"
						onPress={onClose}
						disabled={saving}
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
							void handleSave();
						}}
						disabled={isDisabled}
					>
						<SizableText color="$white" size="$title3">
							{t('Save')}
						</SizableText>
					</Button>
				</XStack>
			</YStack>

			{/* Delete confirmation — inline overlay (AlertDialog.Portal doesn't pierce RN Modal) */}
			{deleteConfirmVisible && (
				<View style={styles.inlineOverlay}>
					<YStack
						backgroundColor="$background"
						borderRadius={16}
						borderWidth={1}
						borderColor="$borderColor"
						padding={24}
						width="90%"
						elevation={8}
					>
						<SizableText size="$title2" marginBottom={8}>
							{t('Delete transaction')}
						</SizableText>
						<SizableText size="$title3" marginBottom={20}>
							{t(
								'Are you sure you want to delete this transaction?',
							)}
						</SizableText>
						<XStack justifyContent="space-between">
							<Button
								borderColor="$primary200"
								backgroundColor="transparent"
								borderRadius={28}
								style={styles.button}
								onPress={() => setDeleteConfirmVisible(false)}
							>
								<SizableText color="$primary100" size="$title3">
									{t('Cancel')}
								</SizableText>
							</Button>
							<Button
								backgroundColor="$red10"
								borderRadius={28}
								style={styles.button}
								onPress={() => {
									setDeleteConfirmVisible(false);
									void handleDelete();
								}}
							>
								<SizableText color="$white" size="$title3">
									{t('Delete')}
								</SizableText>
							</Button>
						</XStack>
					</YStack>
				</View>
			)}

			{/* Error feedback — inline overlay */}
			{feedbackMessage !== null && (
				<View style={styles.inlineOverlay}>
					<YStack
						backgroundColor="$background"
						borderRadius={16}
						borderWidth={1}
						borderColor="$borderColor"
						padding={24}
						width="90%"
						elevation={8}
					>
						<SizableText size="$title3" marginBottom={20}>
							{feedbackMessage}
						</SizableText>
						<Button
							backgroundColor="$caution"
							borderRadius={28}
							onPress={() => setFeedbackMessage(null)}
							alignSelf="flex-end"
							width="45%"
						>
							<SizableText color="$white" size="$title3">
								{t('OK')}
							</SizableText>
						</Button>
					</YStack>
				</View>
			)}
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
		maxHeight: '85%',
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
	inlineOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		borderRadius: 16,
		zIndex: 10,
	},
});

export default EditTransactionModal;
