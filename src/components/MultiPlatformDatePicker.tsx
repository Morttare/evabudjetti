import DateTimePicker, {
	type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar } from '@tamagui/lucide-icons';
import { format, isValid, parseISO } from 'date-fns';
import React, {
	type ChangeEvent,
	type CSSProperties,
	createElement,
	useEffect,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, SizableText, XStack } from 'tamagui';

type Props = {
	value?: Date | null;
	color: string;
	onChange: (value: Date) => void;
};

export const MultiPlatformDatePicker: React.FC<Props> = ({
	value,
	color,
	onChange,
}) => {
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [date, setDate] = useState<Date | null>(value || null);
	const { t } = useTranslation();

	useEffect(() => {
		setDate(value || null);
	}, [value]);

	const handleDateChange = (
		event: DateTimePickerEvent,
		selectedDate?: Date,
	) => {
		// On Android, picker closes automatically on any action
		// On iOS, we need to handle it differently
		if (Platform.OS === 'android') {
			setDatePickerOpen(false);
		}

		if (event.type === 'set' && selectedDate) {
			setDate(selectedDate);
			onChange(selectedDate);
		}
	};

	const handleWebDateChange = (event: ChangeEvent<HTMLInputElement>) => {
		const selectedDate = parseISO(event.currentTarget.value);
		if (!isValid(selectedDate)) {
			return;
		}

		setDate(selectedDate);
		onChange(selectedDate);
	};

	if (Platform.OS === 'web') {
		return (
			<View style={styles.dateElementsContainer}>
				{createElement('input', {
					type: 'date',
					'aria-label': t('Start date'),
					value: date ? format(date, 'yyyy-MM-dd') : '',
					onChange: handleWebDateChange,
					style: webDateInputStyle,
				})}
			</View>
		);
	}

	return (
		<XStack f={1} ai={'center'} maxWidth={'25%'}>
			{/* Display selected date */}
			<SizableText size="$body" color={`$${color}`}>
				{date ? format(date, 'd.MM.yy') : 'd.mm.yy'}
			</SizableText>

			{/* Calendar button */}
			<Button
				size="$3"
				icon={Calendar}
				color={`$${color}`}
				onPress={() => setDatePickerOpen(true)}
				chromeless
			/>

			{/* Date Picker - only rendered when open */}
			{datePickerOpen && (
				<DateTimePicker
					value={date instanceof Date ? date : new Date()}
					mode="date"
					display={Platform.OS === 'ios' ? 'compact' : 'default'}
					onChange={handleDateChange}
				/>
			)}
		</XStack>
	);
};

const styles = StyleSheet.create({
	dateElementsContainer: {
		flex: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		width: 180,
	},
});

const webDateInputStyle: CSSProperties = {
	width: '100%',
	minWidth: 0,
	height: 45,
	padding: '0 10px',
	border: '1px solid #0A5B55',
	borderRadius: 15,
	backgroundColor: '#fff',
	color: '#0A5B55',
	fontSize: 16,
	fontFamily: 'inherit',
	boxSizing: 'border-box',
};
