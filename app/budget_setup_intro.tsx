import { PiggyBank } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, SizableText, Text, YStack } from 'tamagui';

export default function BudgetSetupIntro() {
	const { t } = useTranslation();
	const router = useRouter();

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: '#fff'  }} edges={['left', 'right', 'bottom']}>
			<YStack
				backgroundColor="$white"
				paddingHorizontal={24}
				alignItems="center"
				justifyContent="center"
				flex={1}
				gap="$8"
			>
				<PiggyBank size={150} color="$primary100" />

				{/* Information about what comes next */}
				<YStack alignItems="center" gap="$4" maxWidth={420}>
					<Text
						fontSize="$5"
						fontWeight={700}
						color="$primary100"
						textAlign="center"
					>
						{t('Balance saved!')}
					</Text>
					<Text
						fontSize="$4"
						color="$gray700"
						textAlign="center"
						lineHeight={28}
					>
						{t('Budget setup next')}
					</Text>
				</YStack>

				<Button
					size={52}
					width={280}
					backgroundColor="$primary200"
					borderRadius={40}
					onPress={() => router.replace('/budget_wizard')}
				>
					<SizableText
						size="$title1"
						color="$white"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{t('Continue to budget')}
					</SizableText>
				</Button>
			</YStack>
		</SafeAreaView>
	);
}
