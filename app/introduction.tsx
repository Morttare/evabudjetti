import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ListItem, SizableText, Text, YGroup, YStack } from 'tamagui';
import { useInstructionStore } from '@/src/store/useInstructionStore';

export default function Introduction() {
	const { t } = useTranslation();
	const router = useRouter();
	const { setInstructionShown } = useInstructionStore();

	const showApp = () => {
		setInstructionShown(true);
		router.push('/');
	};

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
			<YStack
				backgroundColor="$white"
				paddingHorizontal={10}
				alignItems="center"
				justifyContent="center"
				flex={1}
				gap={60}
			>
				<YStack alignItems="center">
					<Text
						fontSize="$10"
						fontWeight={700}
						color="$primary100"
						textAlign="center"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{t('Welcome')}
					</Text>
					<Text
						fontSize="$7"
						fontWeight={600}
						color="$primary100"
						textAlign="center"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{t('to EVA MyBudget')}
					</Text>
				</YStack>

				<YGroup gap={15} width={300}>
					<YGroup.Item>
						<ListItem>
							<SizableText
								size="$title2"
								color="$black"
								textAlign="center"
							>
								{t('1. instruction')}
							</SizableText>
						</ListItem>
					</YGroup.Item>

					<YGroup.Item>
						<ListItem>
							<SizableText
								size="$title2"
								color="$gray700"
								textAlign="center"
							>
								{t('2. instruction')}
							</SizableText>
						</ListItem>
					</YGroup.Item>
				</YGroup>

				<Button
					size={52}
					width={200}
					backgroundColor="$primary100"
					alignSelf="center"
					borderRadius={40}
					onPress={showApp}
				>
					<SizableText size="$title2" color="$white">
						{t('Continue')}
					</SizableText>
				</Button>
			</YStack>
		</SafeAreaView>
	);
}
