import { Globe, PiggyBank } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SizableText, Text, YStack } from 'tamagui';
import LanguagePickerDialog from '@/src/components/LanguagePickerDialog';

export default function Landing() {
	const { t } = useTranslation();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: '#fff' }}
		>
			<YStack
				backgroundColor="$white"
				paddingHorizontal={10}
				alignItems="center"
				justifyContent="center"
				flex={1}
				gap={60}
			>
				<YStack alignItems="center" gap={5}>
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

				<PiggyBank size={220} color="$primary100" />

				<Button
					size={52}
					width={250}
					backgroundColor="$primary100"
					alignSelf="center"
					borderRadius={40}
					onPress={() => router.replace('/introduction')}
				>
					<SizableText size="$title1" color="$white">
						{t("Let's start!")}
					</SizableText>
				</Button>
			</YStack>

			<LanguagePickerDialog
				trigger={
					<Button
						position="absolute"
						top={insets.top + 12}
						right={12}
						size={50}
						circular
						chromeless
						accessibilityLabel={t('Language')}
						icon={<Globe size={35} color="$primary100" />}
					/>
				}
			/>
		</SafeAreaView>
	);
}
