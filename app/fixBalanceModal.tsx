import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import {
	AlertDialog,
	SizableText,
	Button,
	Dialog,
	Input,
	Text,
	XStack,
	YStack,
} from 'tamagui';
import { useAddBalanceReconciliation } from '@/src/finance/hook/useAddBalanceReconciliation';
import { useBalances } from '@/src/finance/hook/useBalances';

export default function FixBalanceModal() {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');

	const saveBalanceReconciliation = useAddBalanceReconciliation();

	const today = new Date();
	const currentMonthBalances = useBalances(
		today.getFullYear(),
		today.getMonth(),
		today.getFullYear(),
		today.getMonth(),
	);
	const currentBalance =
		currentMonthBalances[0]?.dailyBalances[today.getDate() - 1]?.balance ??
		0;

	const numericInput = Number(inputValue);
	const difference = Number.isNaN(numericInput)
		? 0
		: numericInput - currentBalance;

	const [dialogHeight, setDialogHeight] = useState(0);

	const handleConfirmSave = async () => {
		if (!Number.isNaN(numericInput)) {
			await saveBalanceReconciliation(numericInput);
			setConfirmOpen(false);
			setOpen(false);
			setInputValue('');
		}
	};

	return (
		<Dialog modal open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<Button
					borderRadius={40}
					backgroundColor="$primary200"
					size={'$buttons.lg'}
				>
					<Text color={'$white'}>{t('EDIT BALANCE')}</Text>
				</Button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay
					key="overlay"
					opacity={0.5}
					onPress={() => {
						setOpen(false);
						setInputValue('');
					}}
				/>
				<Dialog.Content
					key="content"
					width="100%"
					onLayout={(event: LayoutChangeEvent) => {
						setDialogHeight(event.nativeEvent.layout.height);
					}}
				>
					<Dialog.Title paddingBottom={5}>
						{t('Update Account Balance')}
					</Dialog.Title>

					<YStack gap="$3">
						<Text paddingTop={12}>
							{t('Current Planned Balance')}: {currentBalance}€
						</Text>

						<Input
							size="$10"
							paddingHorizontal="$4"
							width="100%"
							value={inputValue}
							onChangeText={setInputValue}
							keyboardType="numeric"
							placeholder={t('New actual balance')}
							borderColor="$primary100"
							backgroundColor="$white"
							placeholderTextColor="$gray9"
							fontSize={15}
						/>

						<Text color={difference >= 0 ? '$green' : '$red'}>
							{t('Difference')}: {difference > 0 ? '+' : ''}
							{difference}€
						</Text>

						<XStack
							gap="$3"
							marginTop="$2"
							justifyContent="space-between"
						>
							<Button
								height={40}
								f={1}
								borderRadius={28}
								borderColor="$primary200"
								backgroundColor="transparent"

								onPress={() => {
									setOpen(false);
									setInputValue('');
								}}
							>
								<SizableText color="$primary100" size="$title3">
									{t('Cancel')}
								</SizableText>
							</Button>

							<Button
								height={40}
								f={1}
								borderRadius={28}
								backgroundColor="$primary200"
								color="white"
								disabled={
									inputValue === '' ||
									Number.isNaN(numericInput)
								}
								onPress={() => setConfirmOpen(true)}
							>
								<SizableText color="$white" size="$title3">
									{t('Save')}
								</SizableText>
							</Button>
						</XStack>
					</YStack>
				</Dialog.Content>
			</Dialog.Portal>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Portal>
					<AlertDialog.Overlay key="overlay" opacity={0.5} />
					<AlertDialog.Content
						key="content"
						width="100%"
						maxWidth={400}
						padding="$5"
						height={dialogHeight > 0 ? dialogHeight : 'auto'}
						justifyContent="space-between"
					>
						<AlertDialog.Title paddingBottom={20}>
							{t('Are you sure?')}
						</AlertDialog.Title>
						<AlertDialog.Description paddingTop={20}>
							{t('This will alter the balance record.')}
						</AlertDialog.Description>

						<XStack
							gap="$3"
							justifyContent="space-between"
							alignItems="center"
						>
							<AlertDialog.Cancel asChild>
								<Button
									f={1}
									height={40}
									borderRadius={28}
									borderColor="$primary200"
									backgroundColor="transparent"
								>
									<SizableText color="$primary100" size="$title3">
										{t('Cancel')}
									</SizableText>
								</Button>
							</AlertDialog.Cancel>
							<AlertDialog.Action asChild>
								<Button
									f={1}
									height={40}
									borderRadius={28}
									backgroundColor="$primary200"
									color="white"
									onPress={handleConfirmSave}
								>
									{t('Confirm')}
								</Button>
							</AlertDialog.Action>
						</XStack>
					</AlertDialog.Content>
				</AlertDialog.Portal>
			</AlertDialog>
		</Dialog>
	);
}
