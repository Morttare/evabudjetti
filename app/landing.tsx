import { PiggyBank } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, SizableText, Text, YStack } from 'tamagui';

export default function Landing() {
	const { t } = useTranslation();
	const router = useRouter();

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
			<YStack
				backgroundColor="$white"
				paddingTop="$paddingmd"
				paddingHorizontal={10}
				alignItems="center"
				flex={1}
				gap={70}
			>
				<YStack paddingTop={70} alignItems="center" gap={5}>
					<Text
						fontSize="$7"
						fontWeight={700}
						color="$primary100"
						textAlign="center"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{t('EVA MyBudget')}
					</Text>
					<Text
						fontSize="$4"
						textAlign="center"
						numberOfLines={1}
						adjustsFontSizeToFit
						color="$primary100"
					>
						{t('Supporting your financial well-being')}
					</Text>
				</YStack>

				<PiggyBank
					size={220}
					style={{ height: '100%' }}
					color="$primary100"
				/>

				<Button
					size={52}
					width={250}
					backgroundColor="$primary100"
					alignSelf="center"
					borderRadius={40}
					onPress={() => router.push('/introduction')}
				>
					<SizableText size="$title1" color="$white">
						{t("Let's start!")}
					</SizableText>
				</Button>
			</YStack>
		</SafeAreaView>
	);
}
