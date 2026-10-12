import { useTranslation } from 'react-i18next';
import { Text, YStack } from 'tamagui';
import type { TransactionOccurrence } from '../dataModel';
import DailyEventListItem from './DailyEventListItem';

interface Props {
	transactions: TransactionOccurrence[];
	monthKey: string;
	selectedDate: Date;
	onEditPress?: (txn: TransactionOccurrence) => void;
	onEditPlannedPress?: (txn: TransactionOccurrence) => void;
	formatCurrency: (value: number, hideSign?: boolean) => string;
}

const DailyEventList: React.FC<Props> = ({
	transactions,
	monthKey,
	selectedDate,
	onEditPress,
	onEditPlannedPress,
	formatCurrency,
}) => {
	const { t } = useTranslation();
	const NoTxnNotice = `${t('No transactions')}.`;

	// Array of month names for the title
	const monthNames = [
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

	// Get the year and month numbers from monthKey
	const year = Number(monthKey.slice(0, monthKey.indexOf('-')));
	const month =
		Number(monthKey.slice(monthKey.indexOf('-') + 1, monthKey.length)) - 1;

	// Always display current month. Also display year if not the same year as selected date.
	const title =
		t(monthNames[month]) +
		(year !== selectedDate.getFullYear() ? ` ${year}` : '');
	const isSelectedMonth = month === selectedDate.getMonth();

	// Normalize dates: ensure each txn.date is a Date object so getTime() is available
	const normalizedTxns: TransactionOccurrence[] = transactions.map((t) => {
		const parsedDate =
			// if already a Date keep it, otherwise create a Date from the value
			t.date instanceof Date
				? t.date
				: new Date(t.date as unknown as string);
		return { ...t, date: parsedDate };
	});

	// Placeholder empty transaction for the selected date
    const emptyTxn: TransactionOccurrence = {
        name: '',
        categoryId: -1,
        amount: 0,
        date: selectedDate,
        type: 'income',
    };

    // Group transactions by day using a Map
    const txnsByDateMap = new Map<number, TransactionOccurrence[]>();
    for (const txn of normalizedTxns) {
        const day = txn.date.getDate();
        if (!txnsByDateMap.has(day)) {
            txnsByDateMap.set(day, []);
        }
        txnsByDateMap.get(day)!.push(txn);
    }

    // If it's the selected month, ensure the selected date's day exists in the map
    if (isSelectedMonth) {
        const selectedDay = selectedDate.getDate();
        if (!txnsByDateMap.has(selectedDay)) {
            txnsByDateMap.set(selectedDay, [emptyTxn]);
        }
    }

    // Convert map values to an array of daily groups
    const txnsByDate: TransactionOccurrence[][] = Array.from(
        txnsByDateMap.values(),
    );

    // Sort all day groups chronologically ascending (Oldest day at top, newest at bottom)
    txnsByDate.sort((a, b) => a[0].date.getTime() - b[0].date.getTime());

	txnsByDate.push;
	/* 
	Function to calculate the total balance change for 
	all transactions on a given date
	*/
	const sumOfTxns = (index: number) => {
		const dTxns = txnsByDate[index];
		let sum = 0;
		for (const t of dTxns) {
			if (t.type === 'income') sum += t.amount;
			else sum -= t.amount;
		}
		return sum;
	};
	/* 
	Rendered for months that have no transactions 
   	(and are not the same month as selectedDays)
	*/
	if (txnsByDate.length === 0) {
		return (
			<YStack gap={8} marginBottom={8}>
				{title !== '' && (
					<Text fontSize={'$title1'} fontWeight={'700'} mt={'$2'}>
						{title}
					</Text>
				)}
				<Text style={{ fontStyle: 'italic' }}>{NoTxnNotice}</Text>
			</YStack>
		);
	} else {
		return (
			<YStack gap={8} marginBottom={8}>
				{title !== '' && (
					<Text fontSize={'$title1'} fontWeight={'700'} mt={'$2'}>
						{title}
					</Text>
				)}
				{txnsByDate.map((dTxns, index) => (
					<DailyEventListItem
						dTxns={dTxns}
						date={dTxns[0].date}
						noTxnNotice={NoTxnNotice}
						sum={sumOfTxns(index)}
						isSelected={
							dTxns[0].date.toDateString() ===
							selectedDate.toDateString()
						}
						onEditPress={onEditPress}
						onEditPlannedPress={onEditPlannedPress}
						formatCurrency={formatCurrency}
						key={`${monthKey}-${dTxns[0].date.getDate()}`}
					></DailyEventListItem>
				))}
			</YStack>
		);
	}
};

export default DailyEventList;
