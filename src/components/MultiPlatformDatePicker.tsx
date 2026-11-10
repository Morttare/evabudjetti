import DateTimePicker, {
	type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar } from '@tamagui/lucide-icons';
import { format, parse } from 'date-fns';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Input, SizableText, XStack } from 'tamagui';

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
	const [editorDate, setEditorDate] = useState<string>('');
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [date, setDate] = useState<Date | null>(value || null);
	const { t } = useTranslation();

	useEffect(() => {
		setDate(value || null);
		setEditorDate(value ? format(value, 'dd/MM/yyyy') : '');
	}, [value]);

	// Only update date when editorDate is valid and different
	useEffect(() => {
		const isValidDateFormat = /^\d{2}-\d{2}-\d{4}$/.test(editorDate);
		if (isValidDateFormat) {
			const parsedDate = parse(editorDate, 'dd/MM/yyyy', new Date());
			if (!Number.isNaN(parsedDate.getTime())) {
				const parsedTime = parsedDate.getTime();
				let currentTime = NaN;
				if (date instanceof Date) {
					currentTime = date.getTime();
				}
				if (Number.isNaN(currentTime) || parsedTime !== currentTime) {
					onChange(parsedDate);
					setDate(parsedDate);
				}
			}
		}
	}, [editorDate, onChange, date]);

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
			setEditorDate(format(selectedDate, 'dd/MM/yyyy'));
			onChange(selectedDate);
		}
	};

	if (Platform.OS === 'web') {
		return (
			<View style={styles.dateElementsContainer}>
				<Input
					color="$primary100"
					flex={1}
					placeholder={t('Write the date here (DD-MM-YYYY)')}
					placeholderTextColor="#a3a3a3"
					value={editorDate}
					onChangeText={setEditorDate}
				/>
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
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
});
