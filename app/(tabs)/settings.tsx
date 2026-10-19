import { Check, ChevronDown, ChevronRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { type PropsWithChildren, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
	Button,
	Dialog,
	Input,
	Select,
	Separator,
	SizableText,
	View,
	XStack,
	YStack,
} from 'tamagui';
import { MultiPlatformDatePicker } from '@/src/components/MultiPlatformDatePicker';
import { useInstructionStore } from '@/src/store/useInstructionStore';
import {
	type LengthOptions,
	useTimeframeStore,
} from '@/src/store/useTimeframeStore';
import { useLanguageStore } from '../../src/store/useLanguageStore';

interface Language {
	code: 'fi' | 'en';
	label: string;
}

export default function Settings() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const { language, setLanguage } = useLanguageStore();
	const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
	const [timeframeDialogOpen, setTimeframeDialogOpen] = useState(false);
	const [timeframeLengthInput, setTimeframeLengthInput] = useState('1');
	const [selectOpen, setSelectOpen] = useState(false);
	const [timeframeOption, setTimeframeOption] =
		useState<LengthOptions>('months');
	const {
		timeframeStartYear,
		timeframeStartMonth,
		timeframeStartDay,
		timeframeLength,
		setStartDate,
		setLength,
	} = useTimeframeStore();
	// temp date used to enable the user to cancel
	const [tempStartDate, setTempStartDate] = useState(
		new Date(timeframeStartYear, timeframeStartMonth, timeframeStartDay),
	);

	// temporary instruction page test
	const { setInstructionShown } = useInstructionStore();

	const defaultStartDate = new Date(
		timeframeStartYear,
		timeframeStartMonth,
		timeframeStartDay,
	);

	const possibleLanguages: Language[] = [
		{ code: 'fi', label: 'Suomi' },
		{ code: 'en', label: 'English' },
	];

	const timeframeOptions: LengthOptions[] = [
		'days',
		'weeks',
		'months',
		'years',
	];

	const currentLanguage = useMemo(() => {
		const activeLang = i18n.language || language;
		return activeLang.startsWith('fi') ? 'fi' : 'en';
	}, [i18n.language, language]);

	const changeLanguage = async (code: 'fi' | 'en') => {
		await i18n.changeLanguage(code);
		setLanguage(code);
		setLanguageDialogOpen(false);
	};

	const getTimeframeLength = (): number => {
		const length = Number(timeframeLengthInput);
		if (!Number.isNaN(length) && length > 0) {
			return length;
		}

		setTimeframeLengthInput('1');
		return 1;
	};

	const checkText = () => {
		getTimeframeLength();
	};

	const resetTimeframeDraft = () => {
		setTempStartDate(defaultStartDate);
		setTimeframeLengthInput(String(timeframeLength.length));
		setTimeframeOption(timeframeLength.type);
		setSelectOpen(false);
	};

	const handleTimeframeDialogOpenChange = (open: boolean) => {
		if (open) {
			resetTimeframeDraft();
		}
		setTimeframeDialogOpen(open);
	};

	const changeTimeframe = () => {
		setStartDate(tempStartDate);
		setLength(getTimeframeLength(), timeframeOption);
		setTimeframeDialogOpen(false);

		// close select
		setSelectOpen(false);
	};

	const handleCancelButtonPressed = () => {
		resetTimeframeDraft();
		setTimeframeDialogOpen(false);
	};

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
			<YStack
				backgroundColor={'$white'}
				paddingTop={'$paddingmd'}
				paddingHorizontal={10}
				flex={1}
			>
				<SettingsPopup
					title={t('Language')}
					open={languageDialogOpen}
					onOpenChange={setLanguageDialogOpen}
				>
					<YStack paddingHorizontal={10}>
						{possibleLanguages.map((lang) => (
							<Button
								unstyled
								key={lang.code}
								justifyContent="space-between"
								alignItems="center"
								onPress={() => changeLanguage(lang.code)}
								paddingVertical={12}
								color="$black"
							>
								<XStack
									width="100%"
									justifyContent="space-between"
									alignItems="center"
								>
									<SizableText size="$title2" color="$black">
										{lang.label}
									</SizableText>

									{currentLanguage === lang.code ? (
										<Check size={20} />
									) : null}
								</XStack>
							</Button>
						))}
					</YStack>
				</SettingsPopup>

				<SettingsPopup
					title={t('Timeframe')}
					open={timeframeDialogOpen}
					onOpenChange={handleTimeframeDialogOpenChange}
					closeKeyboard
					onKeyboardClose={checkText}
				>
					<YStack gap={10} paddingHorizontal={10} paddingTop={20}>
						<XStack gap={5}>
							<SizableText size="$title3" color="$black">
								{t('Start date')} *
							</SizableText>

							<MultiPlatformDatePicker
								value={tempStartDate}
								color="$primary100"
								onChange={setTempStartDate}
							/>
						</XStack>

						<YStack>
							<SizableText size="$title3" color="$black">
								{t('Timeframe length')}
							</SizableText>

							<XStack gap={5} alignItems="unset">
								<Input
									color="$black"
									borderColor="$black"
									textAlign="center"
									maxLength={3}
									value={timeframeLengthInput}
									onChangeText={setTimeframeLengthInput}
									keyboardType="numeric"
									style={{
										minWidth: '21%',
										height: selectOpen ? '25%' : '100%',
									}}
								/>

								<View>
									<Select
										value={timeframeOption}
										defaultValue="months"
										onValueChange={(
											option: LengthOptions,
										) => {
											setTimeframeOption(option);
											setSelectOpen(false);
										}}
										disablePreventBodyScroll
										native="web"
									>
										<Select.Trigger
											height={45}
											iconAfter={ChevronDown}
											borderColor="$black"
											borderWidth={selectOpen ? 2 : 1}
											borderBottomLeftRadius={
												selectOpen ? 0 : 15
											}
											borderBottomRightRadius={
												selectOpen ? 0 : 15
											}
											onPressOut={() =>
												setSelectOpen(!selectOpen)
											}
										>
											<Select.Value
												placeholder={t(timeframeOption)}
											/>
										</Select.Trigger>

										<Select.Content>
											<Select.Viewport>
												<Select.Group>
													<View
														height={
															selectOpen
																? 'auto'
																: 0
														}
														overflow="hidden"
													>
														{timeframeOptions.map(
															(option, i) => (
																<Select.Item
																	index={i}
																	key={option}
																	value={
																		option
																	}
																	onTouchEnd={() => {
																		setTimeframeOption(
																			option,
																		);
																		setSelectOpen(
																			false,
																		);
																	}}
																	borderColor="$black"
																	borderWidth={
																		1
																	}
																	borderTopWidth={
																		0
																	}
																	borderBottomWidth={
																		i ===
																		timeframeOptions.length -
																			1
																			? 1
																			: 0
																	}
																	borderBottomLeftRadius={
																		i ===
																		timeframeOptions.length -
																			1
																			? 15
																			: 0
																	}
																	borderBottomRightRadius={
																		i ===
																		timeframeOptions.length -
																			1
																			? 15
																			: 0
																	}
																>
																	<Select.ItemText>
																		{t(
																			option,
																		)}
																	</Select.ItemText>
																	<Select.ItemIndicator marginLeft="auto">
																		<Check
																			size={
																				16
																			}
																		/>
																	</Select.ItemIndicator>
																</Select.Item>
															),
														)}
													</View>
												</Select.Group>
											</Select.Viewport>
										</Select.Content>
									</Select>
								</View>
							</XStack>
						</YStack>

						<XStack alignSelf="flex-end" gap={10}>
							<Button
								onPress={handleCancelButtonPressed}
								borderColor="$primary200"
								backgroundColor="transparent"
								size="$buttons.lg"
								borderRadius={28}
								alignItems="center"
							>
								<SizableText size="$title3" color="$primary100">
									{t('Cancel')}
								</SizableText>
							</Button>

							<Button
								onPress={changeTimeframe}
								backgroundColor="$primary200"
								size="$buttons.lg"
								borderRadius={28}
								alignItems="center"
							>
								<SizableText size="$title3" color="$white">
									{t('Save')}
								</SizableText>
							</Button>
						</XStack>
					</YStack>
				</SettingsPopup>

				<Button
					unstyled
					width="100%"
					justifyContent="space-between"
					alignItems="center"
					paddingVertical={14}
					paddingHorizontal={0}
					color="$black"
					onPress={() => router.push('/finance_debug')}
				>
					<XStack
						width="100%"
						justifyContent="space-between"
						alignItems="center"
					>
						<YStack>
							<SizableText color="$black" size="$title2">
								Financial debug / test view
							</SizableText>
							<SizableText size="$2" color="$black">
								Temporary
							</SizableText>
						</YStack>
						<ChevronRight size="$icons.sm" color="$black" />
					</XStack>
				</Button>

				<Separator />

				<Button
					unstyled
					width="100%"
					justifyContent="space-between"
					alignItems="center"
					paddingVertical={14}
					paddingHorizontal={0}
					color="$black"
					onPress={() => setInstructionShown(false)}
				>
					<XStack
						width="100%"
						justifyContent="space-between"
						alignItems="center"
					>
						<YStack>
							<SizableText color="$black" size="$title2">
								Show introduction page
							</SizableText>
							<SizableText size="$2" color="$black">
								Temporary
							</SizableText>
						</YStack>
						<ChevronRight size="$icons.sm" color="$black" />
					</XStack>
				</Button>
				<Separator />
			</YStack>
		</SafeAreaView>
	);
}

interface CommonProps extends PropsWithChildren {
	title: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Require onKeyboardClose prop if closeKeyboard exists
// Used to fix keyboard not closing on ios
interface KeyboardCloseProps {
	closeKeyboard: true;
	onKeyboardClose: () => void;
}

interface NoKeyboardCloseProps {
	closeKeyboard?: undefined;
	onKeyboardClose?: never;
}

type PopupProps = CommonProps & (KeyboardCloseProps | NoKeyboardCloseProps);

function SettingsPopup({
	title,
	open,
	onOpenChange,
	closeKeyboard,
	onKeyboardClose,
	children,
}: PopupProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange} modal>
			<Dialog.Trigger asChild>
				<Button
					unstyled
					width="100%"
					justifyContent="space-between"
					alignItems="center"
					paddingVertical={14}
					paddingHorizontal={0}
					color="$black"
				>
					<XStack
						width="100%"
						justifyContent="space-between"
						alignItems="center"
					>
						<SizableText color="$black" size="$title2">
							{title}
						</SizableText>
						<ChevronRight size="$icons.sm" color="$black" />
					</XStack>
				</Button>
			</Dialog.Trigger>

			<Separator />

			<Dialog.Portal>
				<Dialog.Overlay key="overlay" opacity={0.5} />
				<Dialog.Content
					key="content"
					bordered
					elevate
					width="90%"
					padding={24}
					gap={10}
				>
					<Dialog.Title padding={8}>{title}</Dialog.Title>
					{/* Necessary to close keyboard when tapping outside of input */}
					<TouchableWithoutFeedback
						onPress={() => {
							if (closeKeyboard) {
								Keyboard.dismiss();
								onKeyboardClose();
							}
						}}
					>
						{children}
					</TouchableWithoutFeedback>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
}
