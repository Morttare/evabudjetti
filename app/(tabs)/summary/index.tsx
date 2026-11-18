import { Calendar, ChevronDown, ChevronRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, SizableText, View, XStack, YStack } from 'tamagui';

interface MonthMeta {
	monthNumber: number; // 0-indexed for calculation (0 = Jan, 11 = Dec)
	translationKey: string; // Key used for i18n
}

export default function YearsScreen() {
	const router = useRouter();
	const { t } = useTranslation();

	const currentYear = new Date().getFullYear();
	const [isOpen, setIsOpen] = useState(false);
	const [selectedYear, setSelectedYear] = useState<string>(
			String(currentYear),
		);

	const availableYears = useMemo(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 6 }, (_, i) =>
			String(currentYear - i),
		).reverse();
	}, []);

	// Define the 12 months with their index and specific translation keys
	const monthsMeta: MonthMeta[] = useMemo(
		() => [
			{ monthNumber: 0, translationKey: 'Jan' },
			{ monthNumber: 1, translationKey: 'Feb' },
			{ monthNumber: 2, translationKey: 'Mar' },
			{ monthNumber: 3, translationKey: 'Apr' },
			{ monthNumber: 4, translationKey: 'May' },
			{ monthNumber: 5, translationKey: 'Jun' },
			{ monthNumber: 6, translationKey: 'Jul' },
			{ monthNumber: 7, translationKey: 'Aug' },
			{ monthNumber: 8, translationKey: 'Sep' },
			{ monthNumber: 9, translationKey: 'Oct' },
			{ monthNumber: 10, translationKey: 'Nov' },
			{ monthNumber: 11, translationKey: 'Dec' },
		],
		[],
	);

	// Split months into chunks of 3 for a 3x4 grid structure (4 rows of 3 columns)
	const monthRows = useMemo(() => {
		const rows = [];
		for (let i = 0; i < monthsMeta.length; i += 3) {
			rows.push(monthsMeta.slice(i, i + 3));
		}
		return rows;
	}, [monthsMeta]);

	return (
		<YStack flex={1} backgroundColor="$background">
			<SizableText
				width="100%"
				paddingHorizontal="$4"
				paddingTop="$3"
				size="$9"
				fontWeight="bold"
				color="$primary100"
				textAlign="center"
			>
				{t('Summary')}
			</SizableText>

			<ScrollView>
				<YStack padding="$4" gap="$4">

					{/* Centered Year Dropdown Trigger Button */}
					<XStack justifyContent="center" width="100%">
						<Button
							width="60%"
							height={55}
							backgroundColor="white"
							borderColor="$primary100"
							borderWidth={1}
							borderRadius="$4"
							paddingHorizontal="$3"
							justifyContent="space-between"
							onPress={() => setIsOpen(true)}
							iconAfter={
								<ChevronDown size={18} color="$color10" />
							}
								>
							<XStack gap="$3" alignItems="center">
								<View
									padding="$2"
									borderRadius={100}
									backgroundColor="$transparent"
								>
									<Calendar size={18} color="$primary100" />
								</View>
								<SizableText fontWeight="bold" size="$5">
									{t('Year')} {selectedYear}
								</SizableText>
							</XStack>
						</Button>
					</XStack>
					
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
			
			{/* Native Modal to ensure backdrop covers root window (including top/bottom bars) */}
			<Modal
				visible={isOpen}
				transparent
				onRequestClose={() => setIsOpen(false)}
			>
				<YStack
					flex={1}
					justifyContent="center"
					alignItems="center"
					backgroundColor="rgba(0,0,0,0.4)"
				>
					<Pressable
						style={StyleSheet.absoluteFill}
						accessibilityRole="button"
						accessibilityLabel={t('Close')}
						onPress={() => setIsOpen(false)}
					/>
					<YStack
						width="60%"
						backgroundColor="$background"
						borderColor="$primary100"
						borderWidth={2}
						borderRadius="$4"
						padding="$3"
						gap="$2"
					>
						{availableYears.map((year) => (
							<Button
								key={year}
								backgroundColor="transparent"
								borderRadius="$4"
								justifyContent="center"
								height={50}
								pressStyle={{ backgroundColor: '$primary300' }}
								onPress={() => {
									setSelectedYear(year);
									setIsOpen(false);
								}}
							>
								<XStack gap="$3" alignItems="center">
									<Calendar size={18} color="$primary100" />
									<SizableText size="$5" fontWeight="500">
										{t('Year')} {year}
									</SizableText>
								</XStack>
							</Button>
						))}
					</YStack>
				</YStack>
			</Modal>
		</YStack>
	);
}
