import { Plus } from '@tamagui/lucide-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
	Button,
	Input,
	ScrollView,
	SizableText,
	Stack,
	XStack,
	YStack,
} from 'tamagui';
import { DEFAULT_ACCOUNT_ID, type RealTransaction } from '../dataModel';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';

type RealTransactionModalProps = {
	onAdd: (item: RealTransaction) => void;
	onClose: () => void;
	transactionType: 'income' | 'expense';
	categories: { key: number; label: string; type: string }[];
	onAddCategory: (categoryName: string) => Promise<void>;
	prefillData?: {
		name?: string;
		amount?: number;
		date?: Date;
		category?: number;
		plannedTransactionId?: number | null;
	};
};

const RealTransactionModal = ({
	onAdd,
	onClose,
	transactionType,
	categories,
	onAddCategory,
	prefillData,
}: RealTransactionModalProps) => {
	const { t } = useTranslation();
	const [name, setName] = useState<string>(prefillData?.name || '');
	const [amount, setAmount] = useState<string>(
		prefillData?.amount?.toString() || '',
	);
	const [date, setDate] = useState<Date>(prefillData?.date || new Date());
	const [selectedCategory, setSelectedCategory] = useState<number>(
		prefillData?.category ?? 0,
	);
	const [categoryModalVisible, setCategoryModalVisible] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');

	const transactionTypeCategories = useMemo(
		() =>
			categories.filter(
				(cat) => cat.type?.toLowerCase() === transactionType,
			),
		[categories, transactionType],
	);

	const displayCategories = useMemo(() => {
		const hasUncategorized = transactionTypeCategories.some(
			(cat) => cat.key === 0,
		);

		if (hasUncategorized) {
			return transactionTypeCategories;
		}

		return [
			{
				key: 0,
				label: t('Uncategorized default'),
				type: transactionType,
			},
			...transactionTypeCategories,
		];
	}, [transactionTypeCategories, transactionType, t]);

	useEffect(() => {
		const hasSelectedCategory = displayCategories.some(
			(category) => category.key === selectedCategory,
		);

		if (!hasSelectedCategory) {
			setSelectedCategory(0);
		}
	}, [displayCategories, selectedCategory]);

	const handleAmountChange = (text: string) => {
		const numeric = text.replace(/[^0-9.,]/g, '');
		const dotSeparators = numeric.replace(',', '.');
		const parts = dotSeparators.split('.');
		if (parts.length === 1) {
			setAmount(parts[0]);
		} else {
			const integer = parts[0];
			const decimal = parts.slice(1).join('').slice(0, 2);
			setAmount(`${integer}.${decimal}`);
		}
	};

	const handleAdd = () => {
		const numAmount = Number.parseFloat(amount);
		if (
			!name.trim() ||
			Number.isNaN(numAmount) ||
			numAmount <= 0 ||
			!date
		) {
			return;
		}

		onAdd({
			accountId: DEFAULT_ACCOUNT_ID,
			name: name.trim(),
			amount: numAmount,
			date,
			type: transactionType,
			categoryId: selectedCategory,
			plannedTransactionId: prefillData?.plannedTransactionId ?? null,
		});
	};

	const isDisabled =
		!name.trim() || !amount || Number.parseFloat(amount) <= 0 || !date;

	const handleAddCategory = async () => {
		if (!newCategoryName.trim()) return;
		try {
			await onAddCategory(newCategoryName);
			setNewCategoryName('');
			setCategoryModalVisible(false);
		} catch (e) {
			console.error('Failed to add category:', e);
		}
	};

	return (
		<View style={styles.container}>
			<YStack backgroundColor="$background" style={styles.card}>
				<SizableText color="$primary100" size="$title2">
					{t(
						`Add ${transactionType === 'income' ? 'Income' : 'Expense'}`,
					)}
				</SizableText>

				<ScrollView style={styles.scrollContainer}>
					<YStack gap={20} paddingVertical={20}>
						{/* Name Input */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title3">
								{t('Name')}
							</SizableText>
							<Input
								color="$primary100"
								placeholder={t('Enter transaction name')}
								value={name}
								onChangeText={setName}
								height={40}
								borderRadius={6}
								px="10px"
								fontSize={'$title3'}
								focusStyle={{
									outlineColor: 'transparent',
								}}
							/>
						</YStack>

						{/* Amount Input */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title3">
								{t('Amount')}
							</SizableText>
							<Input
								color="$primary100"
								placeholder={t('Enter amount (€)')}
								value={amount}
								onChangeText={handleAmountChange}
								keyboardType="decimal-pad"
								height={40}
								borderRadius={6}
								px="10px"
								fontSize={'$title3'}
								focusStyle={{
									outlineColor: 'transparent',
								}}
							/>
						</YStack>

						{/* Category Selection */}
						<YStack gap={8}>
							<SizableText color="$primary100" size="$title3">
								{t('Category')}
							</SizableText>
							<XStack flexWrap="wrap">
								<Button
									onPress={() =>
										setCategoryModalVisible(true)
									}
									icon={Plus}
									size={26}
									padding={14}
									marginRight={8}
									marginBottom={8}
								/>

								{displayCategories.map(({ key, label }) => {
									const selected = key === selectedCategory;
									return (
										<Button
											key={key}
											onPress={() =>
												setSelectedCategory(key)
											}
											size={28}
											padding={14}
											marginRight={8}
											marginBottom={8}
											backgroundColor={
												selected
													? '$primary200'
													: '$white'
											}
										>
											<SizableText size={'$title3'}>
												{label}
											</SizableText>
										</Button>
									);
								})}
							</XStack>
						</YStack>

						{/* Date Picker */}
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
					</YStack>
				</ScrollView>

				{/* Buttons */}
				<XStack justifyContent="space-between" marginTop={20}>
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
							{t('Add')}
						</SizableText>
					</Button>
				</XStack>
			</YStack>

			{/* Add Category Modal */}
			{categoryModalVisible && (
				<Stack
					position="absolute"
					top={0}
					bottom={0}
					left={0}
					right={0}
					backgroundColor="rgba(0, 0, 0, 0.5)"
					justifyContent="center"
					alignItems="center"
					zIndex={1000}
				>
					<YStack
						backgroundColor="$white"
						borderColor={'$black'}
						borderWidth={2}
						opacity={1}
						borderRadius={16}
						padding={24}
						width={'80%'}
						gap={20}
					>
						<SizableText size={'$title1'} marginBottom={8}>
							{t('Add category')}
						</SizableText>
						<Input
							value={newCategoryName}
							onChangeText={setNewCategoryName}
							placeholder={t('Enter category')}
							height={40}
							borderRadius={6}
							marginBottom={22}
							focusStyle={{
								outlineColor: 'transparent',
							}}
							px="10px"
							fontSize={'$title3'}
						/>
						<XStack justifyContent="space-between">
							<Button
								onPress={() => setCategoryModalVisible(false)}
								borderColor="$primary200"
								backgroundColor="transparent"
								borderRadius={28}
								padding={22}
								alignSelf="center"
								fontSize={'$title3'}
							>
								<SizableText
									size={'$title3'}
									color={'$primary100'}
								>
									{t('Cancel')}
								</SizableText>
							</Button>
							<Button
								onPress={handleAddCategory}
								backgroundColor={'$primary200'}
								size={42}
								padding={22}
								borderRadius={28}
								alignSelf="center"
								fontSize={'$title3'}
							>
								<SizableText size={'$title3'} color={'$white'}>
									{t('Save')}
								</SizableText>
							</Button>
						</XStack>
					</YStack>
				</Stack>
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

export default RealTransactionModal;
