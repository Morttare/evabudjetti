import { PiggyBank } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Button, SizableText, YStack } from 'tamagui';

export default function Err() {
	const router = useRouter();

	return (
		<YStack
			flex={1}
			justifyContent="center"
			alignItems="center"
			overflow="scroll"
		>
			{/* Header */}
			<YStack
				alignItems="center"
				marginTop={6}
				justifyContent="space-between"
				gap={10}
			>
				<Button
					disabled
					transparent
					icon={<PiggyBank />}
					size={400}
					marginBottom={-80}
					color={'$primary100'}
				/>
				<SizableText size={'$title2'}>{'404'}</SizableText>
				<SizableText size={'$title2'} marginBottom={16}>
					{'Something went wrong.'}
				</SizableText>
			</YStack>
			{/* Primary CTA */}

			<Button
				size={20}
				marginTop={8}
				borderRadius={28}
				paddingVertical={20}
				backgroundColor={'$primary200'}
				color="$white"
				onPress={() => router.push('/')}
			>
				<SizableText color="$white">{'Back to home'}</SizableText>
			</Button>
			<YStack height={48} />
		</YStack>
	);
}
