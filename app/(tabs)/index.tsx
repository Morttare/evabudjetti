import { MessageCircleQuestion, PiggyBank } from '@tamagui/lucide-icons';
import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet } from 'react-native';
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
	const { getCurrentTimeframeEnd } = useTimeframeStore();

	const today = new Date();
	const timeframeEnd = getCurrentTimeframeEnd(today);

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
		<SafeAreaView
			style={{ flex: 1, backgroundColor: '#fff' }}
			edges={['left', 'right', 'bottom']}
		>
			<ScrollView
				style={{ flex: 1, backgroundColor: '#fff' }}
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
				keyboardShouldPersistTaps="handled"
			>
				<YStack f={1} backgroundColor="$background">
					<YStack f={1} paddingHorizontal={10} justifyContent="center">
						{/* Header */}
						<YStack gap="5" marginTop={10} alignItems="center">
							<Text
								fontSize={'$7'}
								fontWeight={'500'}
								numberOfLines={1}
								adjustsFontSizeToFit
								color="$primary100"
							>
								{t('EVA MyBudget')}
							</Text>

							<Text 
								numberOfLines={1} 
								adjustsFontSizeToFit 
								fontSize={'$3'}
								color="$primary100"
							>
								{t('Supporting your financial well-being')}
							</Text>
					
							{/* Piggy Bank Icon */}
							<PiggyBank
								marginVertical="$4"
								size={110}
								color={'$primary100'}
							/>
							
						</YStack>

						{budgetCreated && (
							<YStack ai={'center'}>
								{/* Current situation card */}
								<YStack
									marginVertical="$4"
									width={'70%'}
									backgroundColor="$white"
									borderColor="$primary200"
									borderRadius={20}
									borderWidth={2}
									padding={10}
								>
									<YStack
										alignItems="center"
										gap={10}
										width="100%"
									>
										<XStack
											width="100%"
											alignItems="center"
										>
											<YStack width={32} />
											<Text
												f={1}
												mt={'$2'}
												textAlign="center"
												fontWeight={'800'}
												fontSize={'$4'}
												marginBottom={'-5%'}
												color="$primary100"
											>
												{t('Usable funds')}:
											</Text>
											<Button
												size={32}
												circular
												chromeless
												onPress={() =>
													setHelpVisible(true)
												}
												icon={
													<MessageCircleQuestion
														color="$primary100"
														size={20}
													/>
												}
											/>
										</XStack>
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
										<Text
											mt={'$3'}
											textAlign="center"
											fontWeight={'800'}
											fontSize={'$4'}
											color="$primary100"
										>
											{t('Current balance')}:
										</Text>
										<Text
											mt={'-5%'}
											mb={'$3'}
											textAlign="center"
											fontWeight={'700'}
											fontSize={'$5'}
											color="$primary100"
										>
											{displayBalance} €
										</Text>
									</YStack>
								</YStack>
								<FixBalanceModal />
							</YStack>
						)}

						{!budgetCreated && (
							<YStack
								gap={5}
								paddingHorizontal={25}
								alignItems="center"
							>
								<Text
									marginVertical="$3"
									textAlign="center"
									fontSize="$3"
									numberOfLines={4}
									adjustsFontSizeToFit
									color="$gray700"
								>
									{t('No budget created')}
								</Text>
								<Input
									size="$10"
									width="70%"
									value={initialBalance}
									onChangeText={setInitialBalance}
									paddingHorizontal="$4"
									borderColor="$primary100"
									backgroundColor="$white"
									keyboardType="numeric"
									fontSize={15}
									marginVertical="$3"
								/>
								<Button
									marginTop={10}
									borderRadius={40}
									backgroundColor="$primary200"
									height={50}
									paddingHorizontal="$4"
									color={'white'}
									disabled={initialBalance === ''}
									onPress={async () => {
										const numericBalance =
											Number(initialBalance);
										await saveBalanceToDb(numericBalance);
										router.push('/budget_wizard');
									}}
								>
									<SizableText
										size="$buttons.md"
										color="$white"
										numberOfLines={1}
										adjustsFontSizeToFit
									>
										{t('Create budget')}
									</SizableText>
								</Button>
							</YStack>
						)}
					</YStack>

				</YStack>
			</ScrollView>
			<Modal
				visible={helpVisible}
				transparent
				animationType="fade"
				statusBarTranslucent
				navigationBarTranslucent
				onRequestClose={() => setHelpVisible(false)}
			>
				<YStack
					f={1}
					justifyContent="center"
					alignItems="center"
					backgroundColor="rgba(0,0,0,0.4)"
				>
					<Pressable
						style={StyleSheet.absoluteFill}
						accessibilityRole="button"
						accessibilityLabel={t('Close')}
						onPress={() => setHelpVisible(false)}
					/>
					<YStack
						backgroundColor="$white"
						borderColor="$primary100"
						borderWidth={2}
						borderRadius={10}
						width="70%"
						shadowColor="$black"
						shadowOffset={{ width: 0, height: 3 }}
						shadowOpacity={0.25}
						shadowRadius={3}
						elevation={2}
						gap="$3"
						padding={20}
					>
						<SizableText
							fontSize="$7"
							textAlign="center"
							maxFontSizeMultiplier={1.3}
							color="$gray700"
						>
							{t('What is disposable income?')}
						</SizableText>
						<SizableText
							fontSize="$6"
							textAlign="center"
							maxFontSizeMultiplier={1.3}
							color="$gray700"
						>
							{t('Help Disposable income')}
						</SizableText>
						<Button
							width={130}
							height={40}
							onPress={() => setHelpVisible(false)}
							backgroundColor="$primary200"
							borderRadius={40}
							alignSelf="center"
						>
							<SizableText color="$white" maxFontSizeMultiplier={1}>
								{t('CLOSE')}
							</SizableText>
						</Button>
					</YStack>
				</YStack>
			</Modal>
		</SafeAreaView>
	);
}
