import { Check } from '@tamagui/lucide-icons';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, SizableText, XStack, YStack } from 'tamagui';
import { useLanguageStore } from '@/src/store/useLanguageStore';

interface LanguagePickerDialogProps {
	trigger: ReactElement;
}

const LANGUAGES = [
	{ code: 'fi', label: 'Suomi' },
	{ code: 'en', label: 'English' },
] as const;

export default function LanguagePickerDialog({
	trigger,
}: LanguagePickerDialogProps) {
	const { t, i18n } = useTranslation();
	const { language, setLanguage } = useLanguageStore();
	const [open, setOpen] = useState(false);
	const activeLanguage = i18n.language || language;
	const currentLanguage = activeLanguage.startsWith('fi') ? 'fi' : 'en';

	const changeLanguage = async (code: 'fi' | 'en') => {
		await i18n.changeLanguage(code);
		setLanguage(code);
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen} modal>
			<Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay
					key="language-overlay"
					backgroundColor="rgba(0,0,0,0.4)"
					onPress={() => setOpen(false)}
				/>
				<Dialog.Content
					key="language-content"
					bordered
					elevate
					width="90%"
					borderColor="$primary100"
					padding={24}
					gap={10}
				>
					<Dialog.Title padding={8}>{t('Language')}</Dialog.Title>
					<YStack paddingHorizontal={10}>
						{LANGUAGES.map(({ code, label }) => (
							<Button
								key={code}
								unstyled
								width="100%"
								justifyContent="space-between"
								alignItems="center"
								onPress={() => changeLanguage(code)}
								paddingVertical={12}
								color="$black"
							>
								<XStack
									width="100%"
									justifyContent="space-between"
									alignItems="center"
								>
									<SizableText size="$title2" color="$black">
										{label}
									</SizableText>
									{currentLanguage === code && (
										<Check size={20} color="$primary100" />
									)}
								</XStack>
							</Button>
						))}
					</YStack>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
}
