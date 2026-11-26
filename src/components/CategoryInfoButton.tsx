import { Info } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Button, SizableText, YStack } from 'tamagui';

const CategoryInfoButton = () => {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);

	return (
		<>
			<Button
				size={32}
				circular
				chromeless
				accessibilityLabel={t('Help')}
				onPress={() => setVisible(true)}
				icon={<Info color="$primary100" size={20} />}
			/>
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				statusBarTranslucent
				navigationBarTranslucent
				onRequestClose={() => setVisible(false)}
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
						onPress={() => setVisible(false)}
					/>
					<YStack
						width="90%"
						maxHeight="80%"
						minHeight={280}
						backgroundColor="$white"
						borderColor="$primary100"
						borderWidth={2}
						borderRadius={10}
						shadowColor="$black"
						shadowOffset={{ width: 0, height: 3 }}
						shadowOpacity={0.25}
						shadowRadius={3}
						elevation={2}
						padding={20}
						justifyContent="space-between"
					>
						<YStack alignItems="center" gap="$3">
							<SizableText
								fontSize="$7"
								color="$gray700"
								maxFontSizeMultiplier={1.3}
							>
								{t('Category info title')}
							</SizableText>
							<SizableText
								fontSize="$6"
								textAlign="center"
								maxFontSizeMultiplier={1.3}
								color="$gray700"
							>
								{t('Category info text')}
							</SizableText>
						</YStack>
						<Button
							width={130}
							height={40}
							onPress={() => setVisible(false)}
							backgroundColor="$primary200"
							borderRadius={40}
							alignSelf="center"
						>
							<SizableText color="$white">
								{t('CLOSE')}
							</SizableText>
						</Button>
					</YStack>
				</YStack>
			</Modal>
		</>
	);
};

export default CategoryInfoButton;
