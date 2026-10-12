import { Calendar, ChevronRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Card, SizableText, View, XStack, YStack } from 'tamagui';

export default function YearsScreen() {
	const router = useRouter();
	const { t } = useTranslation();

	const availableYears = useMemo(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 6 }, (_, i) => String(currentYear - i)).reverse();
	}, []);

	return (
		<YStack flex={1} backgroundColor="$background">
			<ScrollView>
				<YStack padding="$4" gap="$3">
					{availableYears.map((year) => (
						<Card
							key={year}
							bordered
							padding="$4"
							onPress={() => router.push(`/summary/${year}`)}
							backgroundColor="white"
							borderColor="$borderColor"
							pressStyle={{ scale: 0.98 }}
						>
							<XStack
								justifyContent="space-between"
								alignItems="center"
							>
								<XStack gap="$4" alignItems="center">
									<View
										padding="$2"
										borderRadius={100}
										backgroundColor="#f0f4f8"
									>
										<Calendar size={20} color="#0277bd" />
									</View>
									<SizableText fontWeight="bold" size="$6">
										{t('Year')} {year}
									</SizableText>
								</XStack>
								<ChevronRight size={20} color="$color10" />
							</XStack>
						</Card>
					))}
				</YStack>
			</ScrollView>
		</YStack>
	);
}
