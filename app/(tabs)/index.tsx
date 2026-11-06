import { MessageCircleQuestion, PiggyBank } from '@tamagui/lucide-icons';
import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
	Button,
	Input,
	ScrollView,
	SizableText,
	Spacer,
	Text,
	XStack,
	YStack,
} from 'tamagui';
import FixBalanceModal from '@/app/fixBalanceModal';
import { useAddBalanceReconciliation } from '@/src/finance/hook/useAddBalanceReconciliation';
import { useBalances } from '@/src/finance/hook/useBalances';
import { useUsableFunds } from '@/src/finance/hook/useUsableFunds';
import { useTimeframeStore } from '@/src/store/useTimeframeStore';

export default function Landing() {
	const { t } = useTranslation();
	const router = useRouter();
	const [initialBalance, setInitialBalance] = useState('');
	const saveBalanceToDb = useAddBalanceReconciliation();
	const [helpVisible, setHelpVisible] = useState(false);
	const { getCurrentTimeframe } = useTimeframeStore();

	const today = new Date();
	const timeframeEnd = getCurrentTimeframe(today);

	const timespanBalances = useBalances(
		today.getFullYear(),
		today.getMonth(),
		timeframeEnd.getFullYear(),
		timeframeEnd.getMonth(),
	);
	const currentMonthData = timespanBalances[0];

	const budgetCreated = currentMonthData?.endBalance !== undefined;
	const displayBalance =
		currentMonthData?.dailyBalances[today.getDate() - 1]?.balance ?? 0;

	const usableFunds = useUsableFunds(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
		timeframeEnd.getFullYear(),
		timeframeEnd.getMonth(),
		timeframeEnd.getDate(),
	);

	/* 
	Function for calculating the date on which balance reaches zero.
	Checks daily balance for each day in the timespan and returns the first date where
	balance is not positive.
	Returns spanEndDate if balance never reaches zero (positive usable funds).
	(TODO: Test with real values)
	*/
	const getBalanceZeroDate = () => {
		let daysCounter = -today.getDate(); // Tracks difference from current day

		for (const month of timespanBalances) {
			const balances = month.dailyBalances;
			for (let day = 0; day < balances.length; day++) {
				if (balances[day] !== undefined) {
					const balance = balances[day]?.balance;
					if (balance !== undefined && balance <= 0) {
						return addDays(today, daysCounter);
					}
				}
				daysCounter += 1; // If balance was not 0, add day to counter and continue.
			}
		}
		return timeframeEnd;
	};

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
				keyboardShouldPersistTaps="handled"
			>
				<YStack f={1} backgroundColor="$background">
					<YStack f={1} paddingHorizontal={10}>
						{/* Header */}
						<YStack gap="5" marginTop={10} alignItems="center">
							<Text
								fontSize={'$7'}
								fontWeight={'500'}
								numberOfLines={1}
								adjustsFontSizeToFit
							>
								{t('EVA MyBudget')}
							</Text>

							<Text numberOfLines={1} adjustsFontSizeToFit>
								{t('Supporting your financial well-being')}
							</Text>

							<XStack mt={'$5'}>
								<Spacer size={'10%'} />
								{/* Piggy Bank Icon */}
								<PiggyBank
									size={110}
									style={{ height: '100%' }}
									color={'$primary100'}
								/>

								{/* Help Icon positioned relative to the piggy bank */}
								<Button
									size={50}
									style={{ height: '100%' }}
									circular
									chromeless
									onPress={() => setHelpVisible(true)}
									icon={
										<MessageCircleQuestion color="$primary100" />
									}
								/>
							</XStack>
						</YStack>

						{budgetCreated && (
							<YStack f={1} ai={'center'}>
								{/* Current situation card */}
								<YStack
									width={'70%'}
									backgroundColor="$white"
									borderColor="$primary200"
									borderRadius={20}
									borderWidth={2}
									padding={10}
									mt={'$2'}
									mb={'$2'}
								>
									<YStack
										alignItems="center"
										gap={10}
										width="100%"
									>
										<Text
											textAlign="center"
											fontWeight={'600'}
											fontSize={'$3'}
										>
											{t('Current situation')}
											{'\n'}
											{today.toLocaleDateString('fi-FI')}
											{' - '}
											{timeframeEnd.toLocaleDateString(
												'fi-FI',
											)}
										</Text>
										<Text
											textAlign="center"
											fontWeight={'800'}
											fontSize={'$3'}
											marginBottom={'-5%'}
										>
											{t('Usable funds')}:
										</Text>
										<Text
											textAlign="center"
											fontWeight={'700'}
											fontSize={'$5'}
											color={
												usableFunds > 0
													? '$primary100'
													: '$color.danger500'
											}
										>
											{usableFunds.toFixed(2)} €{' '}
											{t('/ day')}
										</Text>
										{usableFunds <= 0 && (
											<Text
												mt={'-5%'}
												color={'$color.danger500'}
											>
												{t('Balance runs out')}{' '}
												{getBalanceZeroDate().toLocaleDateString(
													'fi-FI',
												)}
											</Text>
										)}
										<Text>
											{t('Current balance')}:{' '}
											{displayBalance} €
										</Text>
									</YStack>
								</YStack>
								<FixBalanceModal />
							</YStack>
						)}

						{!budgetCreated && (
							<YStack gap={5} paddingHorizontal={25}>
								<Text numberOfLines={4} adjustsFontSizeToFit>
									{t('No budget created')}
								</Text>
								<Input
									style={{ height: '25%' }}
									width="100%"
									value={initialBalance}
									onChangeText={setInitialBalance}
									borderColor="$primary100"
									backgroundColor="$white"
									keyboardType="numeric"
									fontSize={15}
								/>
								<Button
									style={{ height: '25%' }}
									marginTop={10}
									borderRadius={40}
									backgroundColor="$primary200"
									width="100%"
									color={'white'}
									disabled={initialBalance === ''}
									onPress={async () => {
										const numericBalance =
											Number(initialBalance);
										await saveBalanceToDb(numericBalance);
										router.push('/budget_wizard');
									}}
								>
									{t('Create budget')}
								</Button>
							</YStack>
						)}
					</YStack>

					{/* Help Modal */}
					{helpVisible && (
						<YStack
							position="absolute"
							top={0}
							left={0}
							right={0}
							bottom={0}
							justifyContent="center"
							alignItems="center"
						>
							<Pressable
								style={[
									StyleSheet.absoluteFill,
									{ backgroundColor: 'rgba(0,0,0,0.4)' },
								]}
								accessibilityRole="button"
								accessibilityLabel={t('Close')}
								onPress={() => setHelpVisible(false)}
							/>
							<YStack
								backgroundColor="$white"
								borderColor="$primary100"
								borderWidth={2}
								borderRadius={10}
								width={'70%'}
								shadowColor="$black"
								gap={'3%'}
								padding={20}
							>
								<SizableText
									textAlign="center"
									maxFontSizeMultiplier={1.3}
								>
									{t('Help')}
								</SizableText>
								<SizableText
									textAlign="center"
									maxFontSizeMultiplier={1.3}
								>
									{t('Help Disposable income')}
								</SizableText>
								<Button
									onPress={() => setHelpVisible(false)}
									backgroundColor="$primary200"
									borderRadius={40}
									alignSelf="center"
								>
									<SizableText
										color="$white"
										maxFontSizeMultiplier={1}
									>
										{t('CLOSE')}
									</SizableText>
								</Button>
							</YStack>
						</YStack>
					)}
				</YStack>
			</ScrollView>
		</SafeAreaView>
	);
}
