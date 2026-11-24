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
	useRef,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
	Animated,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { Button, SizableText, XStack, YStack } from 'tamagui';

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
	// Android: native dialog open state
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	// iOS: custom modal visibility
	const [iosModalVisible, setIosModalVisible] = useState(false);
	const [date, setDate] = useState<Date | null>(value || null);
	// Holds the selection until the user confirms (iOS) / initial value (Android)
	const [tempDate, setTempDate] = useState<Date>(value || new Date());
	// 0 = hidden, 1 = shown
	const progress = useRef(new Animated.Value(0)).current;
	const { t } = useTranslation();

	useEffect(() => {
		setDate(value || null);
	}, [value]);

	const openPicker = () => {
		setTempDate(date ?? new Date());

		if (Platform.OS === 'ios') {
			setIosModalVisible(true);
			Animated.timing(progress, {
				toValue: 1,
				duration: 250,
				useNativeDriver: true,
			}).start();
		} else {
			setDatePickerOpen(true);
		}
	};

	// Android: dialog closes itself, so we commit immediately
	const handleAndroidChange = (
		event: DateTimePickerEvent,
		selectedDate?: Date,
	) => {
		setDatePickerOpen(false);

		if (event.type === 'set' && selectedDate) {
			setDate(selectedDate);
			onChange(selectedDate);
		}
	};

	// iOS: only track the selection, commit on "Done"
	const handleIosChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
		if (selectedDate) {
			setTempDate(selectedDate);
		}
	};

	const closeIos = () => {
		Animated.timing(progress, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(() => setIosModalVisible(false));
	};

	const confirmIos = () => {
		setDate(tempDate);
		onChange(tempDate);
		closeIos();
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
		<XStack style={{ transform: [{ translateX: 8 }] }} f={1} ai={'center'} maxWidth={'25%'}>
			{/* Display selected date */}
			<SizableText size="$body" color={`$${color}`}>
				{date ? format(date, 'd.MM.yy') : 'd.mm.yy'}
			</SizableText>

			{/* Calendar button */}
			<Button
				marginLeft={-4}
				size="$3"
				icon={Calendar}
				color={`$${color}`}
				onPress={openPicker}
				chromeless
			/>

			{/* Android: native dialog, only rendered when open */}
			{Platform.OS === 'android' && datePickerOpen && (
				<DateTimePicker
					value={tempDate}
					mode="date"
					display="default"
					onChange={handleAndroidChange}
				/>
			)}

			{/* iOS: backdrop fades, sheet slides */}
			{Platform.OS === 'ios' && (
				<Modal
					visible={iosModalVisible}
					transparent
					animationType="none"
					onRequestClose={closeIos}
				>
					<View style={styles.modalRoot}>
						{/* Backdrop: fades only */}
						<Animated.View
							style={[styles.backdrop, { opacity: progress }]}
						>
							<Pressable
								style={StyleSheet.absoluteFill}
								onPress={closeIos}
							/>
						</Animated.View>

						{/* Sheet: slides only */}
						<Animated.View
							style={{
								transform: [
									{
										translateY: progress.interpolate({
											inputRange: [0, 1],
											outputRange: [400, 0],
										}),
									},
								],
							}}
						>
							<YStack
								backgroundColor="$background"
								paddingBottom="$6"
							>
								<DateTimePicker
									accentColor="#3AA18D"
									themeVariant="light"
									value={tempDate}
									mode="date"
									display="inline"
									onChange={handleIosChange}
									style={styles.iosPicker}
								/>
								<XStack
									jc="space-between"
									paddingHorizontal={44}
								>
									<Button
										borderRadius="$4"
										borderColor="$primary200"
										backgroundColor="$transparent"
										style={styles.button}
										onPress={closeIos}
									>
										<SizableText
											color="$primary100"
											size="$title2"
										>
											{t('Cancel')}
										</SizableText>
									</Button>
									<Button
										onPress={confirmIos}
										borderRadius="$4"
										borderColor="$primary200"
										backgroundColor="$primary200"
										style={styles.button}
									>
										<SizableText
											color="$white"
											size="$title2"
										>
											{t('Finish')}
										</SizableText>
									</Button>
								</XStack>
							</YStack>
						</Animated.View>
					</View>
				</Modal>
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
	modalRoot: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	iosPicker: {
		alignSelf: 'center',
	},
	button: {
		width: '40%',
		height: 44,
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
