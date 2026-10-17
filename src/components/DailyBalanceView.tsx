import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
import { addMonths, subMonths } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { useAddRealTransaction } from '@/src/finance/hook/useAddRealTransaction';
import { useOccurrencesAndBalances } from '@/src/finance/hook/useOccurrencesAndBalances';
import { useUsableFunds } from '@/src/finance/hook/useUsableFunds';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useTimeframeStore } from '@/src/store/useTimeframeStore';
import { LOCALE } from '../constants/index';
import type {
	Category,
	Persisted,
	RealTransaction,
	TransactionOccurrence,
} from '../dataModel';
import { formatCurrency } from '../utils/budgetUtils';
import DailyEventList from './DailyEventList';
import EditTransactionModal from './EditTransactionModal';
import { MultiPlatformDatePicker } from './MultiPlatformDatePicker';
import PlannedTransactionConfirmModal from './PlannedTransactionConfirmModal';
import RealTransactionModal from './RealTransactionModal';
import StyledCard from './styledCard';

interface DailyBalanceViewProps {
	selectedDate: Date;
	onDateChange: (date: Date) => void;
}

// Helper to format date as "dd.mm.yyyy"
const formatDate = (date: Date) => {
	return new Intl.DateTimeFormat(LOCALE, {}).format(date);
};

export default function DailyBalanceView({
	selectedDate,
	onDateChange,
}: DailyBalanceViewProps) {
	const { t } = useTranslation();

	const [editingTransaction, setEditingTransaction] =
		useState<Persisted<RealTransaction> | null>(null);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [addTransactionType, setAddTransactionType] = useState<
		'income' | 'expense'
	>('expense');
	const [confirmingPlannedTxn, setConfirmingPlannedTxn] =
		useState<TransactionOccurrence | null>(null);

	const storeCategories = useCategoryStore();
	const [categories, setCategories] = useState<Persisted<Category>[]>([]);
	useEffect(() => {
		setCategories(storeCategories.categories);
	}, [storeCategories.categories]);

	const addCategory = useCategoryStore((state) => state.addCategory);
	const addRealTransactionToDb = useAddRealTransaction();

	const dynamicCategories = categories.map((cat) => ({
		key: cat.id,
		label: cat.name,
		type: cat.type,
	}));

	const handleEditPress = (txn: TransactionOccurrence) => {
		if (txn.realTransaction) {
			setEditingTransaction(txn.realTransaction);
		}
	};

	const handleEditPlannedPress = (txn: TransactionOccurrence) => {
		setConfirmingPlannedTxn(txn);
	};

	const handleOpenAddModal = (type: 'income' | 'expense') => {
		setAddTransactionType(type);
		setAddModalVisible(true);
	};

	const handleAddTransaction = async (item: RealTransaction) => {
		try {
			await addRealTransactionToDb(item);
			setAddModalVisible(false);
		} catch (error) {
			console.error('Failed to save real transaction:', error);
		}
	};

	const handleAddCategory = async (categoryName: string) => {
		if (!categoryName.trim()) return;
		try {
			await addCategory({
				name: categoryName,
				type: addTransactionType,
				color: '#000000',
				icon: 'circle',
			});
		} catch (error) {
			console.error('Failed to add category:', error);
			throw error;
		}
	};

	/* 
	Variable to determine how many past and future months are rendered. 
	On first load, render only current month
	*/
	const [futureCount, setFutureCount] = useState(0);
	const [pastCount, setPastCount] = useState(0);

	const selectedDay = selectedDate.getDate();

	const selectedYearStr = String(selectedDate.getFullYear());
	const selectedMonthstr =
		selectedDate.getMonth() < 9
			? String(`0${selectedDate.getMonth() + 1}`)
			: String(selectedDate.getMonth() + 1);

	const selectedMonthKey = `${selectedYearStr}-${selectedMonthstr}`;

	// Fetch occurrences and balances for the months that are rendered
	const dataStartDate = subMonths(selectedDate, pastCount);
	const dataEndDate = addMonths(selectedDate, futureCount);

	const occurrencesAndBalances = useOccurrencesAndBalances(
		dataStartDate.getFullYear(),
		dataStartDate.getMonth(),
		dataEndDate.getFullYear(),
		dataEndDate.getMonth(),
	);

	const getSelectedDayBalance = () => {
		for (const month of occurrencesAndBalances) {
			if (month.monthKey === selectedMonthKey) {
				return month.dailyBalances[selectedDay - 1]?.balance;
			}
		}
	};

	const dayBalance = getSelectedDayBalance();

	/* Get  usable funds for selected day */
	const { getCurrentTimeframe } = useTimeframeStore();

	const currentTimeframeEnd = getCurrentTimeframe(selectedDate);

	const usableFunds = useUsableFunds(
		selectedDate.getFullYear(),
		selectedDate.getMonth(),
		selectedDate.getDate(),
		currentTimeframeEnd.getFullYear(),
		currentTimeframeEnd.getMonth(),
		currentTimeframeEnd.getDate(),
	);

	const handlePrevDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() - 1);
		onDateChange(newDate);
	};

	const handleNextDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() + 1);
		onDateChange(newDate);
	};

	// On "load more" press, display 1 more past/future month
	const handleFutureLoadMorePress = () => {
		setFutureCount((prev) => prev + 1);
	};
	const handlePastLoadMorePress = () => {
		setPastCount((prev) => prev + 1);
	};

	return (
		<YStack flex={1}>
			{/* --- Current Day Card (Static on top) --- */}
			<StyledCard
				style={{ borderWidth: 2 }}
				paddingVertical="$2"
				paddingHorizontal="$4"
				borderRadius="$1"
				borderColor="$primary100"
				alignItems="center"
				justifyContent="center"
				backgroundColor="$primary300"
				marginBottom="0"
			>
				{/* Date Header with Navigation */}
				<Text fontSize="$4" fontWeight="600">
					{' '}
					{t('Daily situation')}{' '}
				</Text>
				<XStack alignItems="center" justifyContent="center" gap={20}>
					<Button
						outlineColor="$black"
						size="$buttons.md"
						icon={ChevronLeft}
						onPress={handlePrevDay}
						backgroundColor="$transparent"
						circular
						iconAfter={undefined}
					/>

					<MultiPlatformDatePicker
						value={selectedDate}
						color="black"
						onChange={(value) => {
							onDateChange(value);
						}}
					/>

					<Button
						outlineColor="$black"
						size="$buttons.md"
						icon={ChevronRight}
						onPress={handleNextDay}
						backgroundColor="$transparent"
						circular
						iconAfter={undefined}
					/>
				</XStack>

				{/* Daily Stats */}
				<XStack>
					<YStack alignItems="center" paddingRight={10}>
						<Text color="$black" fontSize="$body" fontWeight="600">
							{t('Account balance')}:
						</Text>
						<Text color="$black" fontSize="$4" fontWeight="800">
							{dayBalance !== undefined
								? formatCurrency(dayBalance)
								: t('Unknown')}
						</Text>
					</YStack>
					<YStack alignItems="center" paddingLeft={10}>
						<Text color="$black" fontSize="$body" fontWeight="600">
							{t('Usable funds')}:
						</Text>
						<Text color="$black" fontSize="$4" fontWeight="800">
							{dayBalance !== undefined
								? `${formatCurrency(usableFunds)} ${t('/ day')}`
								: '--'}
						</Text>
					</YStack>
				</XStack>

				{/* Add Buttons */}
				<XStack gap={8} marginVertical={10}>
					<Button
						backgroundColor="$primary100"
						borderRadius="$4"
						paddingHorizontal="$4"
						paddingVertical="$2"
						height="wrap-content"
						flex={1}
						onPress={() => handleOpenAddModal('income')}
						pressStyle={{ backgroundColor: '$primary200' }}
					>
						<Text
							color="$white"
							fontWeight="500"
							fontSize="$3"
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							{t('Add income short')}
						</Text>
					</Button>
					<Button
						backgroundColor="$primary100"
						borderRadius="$4"
						paddingHorizontal="$4"
						paddingVertical="$2"
						height="wrap-content"
						flex={1}
						onPress={() => handleOpenAddModal('expense')}
						pressStyle={{ backgroundColor: '$primary200' }}
					>
						<Text
							color="$white"
							fontWeight="500"
							fontSize="$3"
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							{t('Add expense short')}
						</Text>
					</Button>
				</XStack>
				<Text color="$black" fontSize="$3" fontWeight="600">
					{t('Usable funds timeframe')}:{' '}
					{`${formatDate(selectedDate)} - ${formatDate(currentTimeframeEnd)}`}
				</Text>
			</StyledCard>

			{/* Edit real transaction modal */}
			<Modal
				visible={editingTransaction !== null}
				onRequestClose={() => setEditingTransaction(null)}
				transparent
			>
				{editingTransaction && (
					<EditTransactionModal
						transaction={editingTransaction}
						onClose={() => setEditingTransaction(null)}
					/>
				)}
			</Modal>

			{/* Add new real transaction modal */}
			<Modal
				visible={addModalVisible}
				onRequestClose={() => setAddModalVisible(false)}
				transparent
			>
				<RealTransactionModal
					onAdd={(item) => {
						void handleAddTransaction({
							...item,
							type: addTransactionType,
						});
					}}
					onClose={() => setAddModalVisible(false)}
					transactionType={addTransactionType}
					categories={dynamicCategories}
					onAddCategory={handleAddCategory}
				/>
			</Modal>

			{/* Confirm / edit planned transaction modal */}
			<Modal
				visible={confirmingPlannedTxn !== null}
				onRequestClose={() => setConfirmingPlannedTxn(null)}
				transparent
			>
				{confirmingPlannedTxn && (
					<PlannedTransactionConfirmModal
						occurrence={confirmingPlannedTxn}
						onClose={() => setConfirmingPlannedTxn(null)}
						onConfirmed={() => setConfirmingPlannedTxn(null)}
					/>
				)}
			</Modal>

			<ScrollView
				flex={1}
				contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }}
				showsVerticalScrollIndicator={false}
			>
				<YStack paddingHorizontal="$1">
					{/* --- Future Load More button --- */}
					<YStack alignItems="center" marginBottom={'$2'}>
						<Text
							color="$primary100"
							fontSize="$body"
							onPress={handlePastLoadMorePress}
							pressStyle={{ color: '$primary300' }}
							cursor={'pointer'}
						>
							{t('Load more')}
						</Text>
					</YStack>

					{/* --- Render all loaded months in order (oldest first) ---*/}
					{occurrencesAndBalances.map((month) => (
						<DailyEventList
							transactions={month.transactionOccurrences}
							monthKey={month.monthKey}
							selectedDate={selectedDate}
							formatCurrency={formatCurrency}
							onEditPress={handleEditPress}
							onEditPlannedPress={handleEditPlannedPress}
							key={month.monthKey}
						/>
					))}

					{/* --- Past Load More button --- */}
					<YStack alignItems="center" marginTop="$2">
						<Text
							color="$primary100"
							fontSize="$body"
							onPress={handleFutureLoadMorePress}
							pressStyle={{ color: '$primary300' }}
							cursor={'pointer'}
						>
							{t('Load more')}
						</Text>
					</YStack>
				</YStack>
			</ScrollView>
		</YStack>
	);
}
