import { Bold, ChevronDown, ChevronUp, Pencil } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Button, SizableText, XStack, YStack } from 'tamagui';
import type { PlannedTransaction } from '@/src/dataModel';
import { LOCALE } from '../constants/index';
import { formatCurrency } from '../utils/budgetUtils';

interface Props {
	item: PlannedTransaction;
	onEdit: (item: PlannedTransaction) => void;
}
// Helper to format date as "dd.mm.yyyy"
const formatDate = (date: Date) => {
	return new Intl.DateTimeFormat(LOCALE, {}).format(date);
};

const BudgetWizardItem: React.FC<Props> = ({ item, onEdit }) => {
	const [isOpen, setOpen] = useState(false);
	const { t } = useTranslation();
	return (
		<XStack
			backgroundColor="$white"
			style={styles.itemContainer}
			borderColor="$primary100"
			onPress={() => setOpen(!isOpen)}
			pressStyle={{ backgroundColor: '$primary300' }}
		>
			<YStack width="100%">
				<XStack
					borderColor={'$primary200'}
					borderBottomWidth={isOpen ? 1 : 0}
					alignItems="flex-start"
					paddingBottom={isOpen ? 10 : 0}
				>
					<XStack gap="10" height="25">
						<SizableText
							color="$primary100"
							fontSize="$5"
							fontStyle={{ Bold }}
							textAlign="left"
							width="40%"
							adjustsFontSizeToFit
						>
							{item.name}
						</SizableText>
						<SizableText
							color="$primary100"
							fontSize="$5"
							fontStyle={{ Bold }}
							textAlign="left"
							width="35%"
							adjustsFontSizeToFit
						>
							{formatCurrency(item.amount)}
						</SizableText>
					</XStack>

					<XStack height="25" gap="5" alignItems="left">
						<Button
							backgroundColor="$primary200"
							color="$white"
							transparent
							width="10%"
							height="100%"
							icon={Pencil}
							onPress={() => {
								onEdit(item);
							}}
						/>
						{isOpen ? (
							<ChevronUp
								size={20}
								color="$primary100"
								alignSelf="left"
							/>
						) : (
							<ChevronDown size={20} color="$primary100" />
						)}
					</XStack>
				</XStack>
				{isOpen && (
					<YStack>
						<XStack gap="10">
							<SizableText
								color="$black"
								size="$4"
								paddingTop="5"
								textAlign="left"
							>
								{`${t(item.recurrenceBase === null ? 'Date' : 'Starts')}: ${formatDate(item.startDate)}`}
							</SizableText>
							{item.endDate !== null && (
								<SizableText
									color="$black"
									size="$4"
									paddingTop="5"
									textAlign="right"
								>
									{`${t('Ends')}: ${formatDate(item.endDate)}`}
								</SizableText>
							)}
						</XStack>
						{item.recurrenceBase !== null && (
							<SizableText
								color="$black"
								size="$4"
								paddingTop="5"
								textAlign="left"
							>
								{`${t('Reoccurs')}: ${item.recurrenceInterval} ${t('Interval')}`}
							</SizableText>
						)}
					</YStack>
				)}
			</YStack>
		</XStack>
	);
};

export default BudgetWizardItem;

const styles = StyleSheet.create({
	itemContainer: {
		borderWidth: 2,
		borderRadius: 8,
		padding: 8,
		marginTop: 5,
	},
});
