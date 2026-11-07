import { ChevronDown, ChevronUp, Pencil } from '@tamagui/lucide-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, XStack, YStack } from 'tamagui';
import { LOCALE } from '../constants/index';
import type { TransactionOccurrence } from '../dataModel';

interface Props {
	dTxns: TransactionOccurrence[];
	date: Date;
	noTxnNotice: string;
	sum: number;
	isSelected: boolean;
	onEditPress?: (txn: TransactionOccurrence) => void;
	onEditPlannedPress?: (txn: TransactionOccurrence) => void;
	formatCurrency: (value: number, hideSign?: boolean) => string;
}

const DailyEventListItem: React.FC<Props> = ({
	dTxns,
	date,
	noTxnNotice,
	sum,
	isSelected,
	onEditPress,
	onEditPlannedPress,
	formatCurrency,
}) => {
	const { t } = useTranslation();
	const [isOpen, setOpen] = useState(isSelected);

	// Automatically open list item when selected
	useMemo(() => {
		if (isSelected) setOpen(true);
	}, [isSelected]);

	return (
		<XStack
			style={{
				padding: 10,
				borderRadius: 10,
				borderWidth: isSelected ? 4 : 3,
				margin: -2,
			}}
			backgroundColor={'$white'}
			borderColor={isSelected ? '$primary200' : '$primary300'}
			pressStyle={{ backgroundColor: '$primary300' }}
			onPress={() => setOpen(!isOpen)}
		>
			<YStack width="100%">
				<XStack
					gap={10}
					backgroundColor="transparent"
					alignItems="center"
					justifyContent="flex-end"
					minWidth={100}
				>
					<Text
						flex={1}
						fontWeight="700"
						textAlign="left"
						fontSize="$body"
					>
						{date.toLocaleDateString(LOCALE)}
					</Text>
					<Text fontSize="$body" fontWeight="700">
						{formatCurrency(sum)}
					</Text>
					{isOpen ? (
						<ChevronUp size={20} />
					) : (
						<ChevronDown size={20} />
					)}
				</XStack>
				{isOpen &&
					(dTxns[0].name !== '' ? (
						(() => {
							const realTxns = dTxns.filter(
								(txn) =>
									txn.realTransaction != null ||
									txn.plannedTransaction == null,
							);
							const plannedTxns = dTxns.filter(
								(txn) =>
									txn.plannedTransaction != null &&
									txn.realTransaction == null,
							);

							const renderRow = (
								txn: TransactionOccurrence,
								index: number,
							) => {
								const itemKey =
									txn.realTransaction?.id != null
										? `r-${txn.realTransaction.id}`
										: txn.plannedTransaction?.id != null
											? `p-${txn.plannedTransaction.id}-${txn.date.getTime()}`
											: `f-${txn.date.getTime()}-${txn.name}-${txn.amount}-${index}`;

								return (
									<XStack
										gap={10}
										backgroundColor="transparent"
										alignItems="center"
										justifyContent="flex-end"
										key={itemKey}
										maxWidth={'100%'}
									>
										<Text
											flex={1}
											fontWeight="400"
											textAlign="left"
											fontSize="$body"
										>
											{txn.name}
										</Text>
										<Text fontSize="$body" fontWeight="400">
											{txn.type === 'income' ? '+' : '-'}
											{formatCurrency(Number(txn.amount))}
										</Text>
										{onEditPress && txn.realTransaction && (
											<Button
												size="$buttons.md"
												circular
												marginBottom="$1"
												backgroundColor="$white"
												borderWidth={1}
												borderColor="$disabled"
												color="$disabled"
												icon={Pencil}
												onPress={() => onEditPress(txn)}
											/>
										)}
										{onEditPlannedPress &&
											txn.plannedTransaction &&
											!txn.realTransaction && (
												<Button
													size="$buttons.md"
													circular
													backgroundColor="$white"
													borderWidth={1}
													borderColor="$disabled"
													color="$disabled"
													icon={Pencil}
													onPress={() =>
														onEditPlannedPress(txn)
													}
												/>
											)}
									</XStack>
								);
							};

							return (
								<>
									{realTxns.map((txn, i) =>
										renderRow(txn, i),
									)}
									{plannedTxns.length > 0 && (
										<>
											<Text
												fontSize="$2"
												fontWeight="600"
												color="$gray500"
												marginTop={
													realTxns.length > 0 ? 6 : 0
												}
												marginBottom={2}
											>
												{t('Planned section title')}
											</Text>
											{plannedTxns.map((txn, i) =>
												renderRow(
													txn,
													realTxns.length + i,
												),
											)}
										</>
									)}
								</>
							);
						})()
					) : (
						<Text
							style={{ fontStyle: 'italic' }}
							color="$primary200"
						>
							{noTxnNotice}
						</Text>
					))}
			</YStack>
		</XStack>
	);
};

export default DailyEventListItem;
