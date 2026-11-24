import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import DailyBalanceView from '@/src/components/DailyBalanceView';

export default function Funds() {
	const [selectedDate, setselectedDate] = useState(new Date());

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<YStack
				backgroundColor={'$color.white'}
				paddingTop={'$paddingmd'}
				paddingHorizontal={10}
				flex={1}
			>
				<DailyBalanceView
					onDateChange={setselectedDate}
					selectedDate={selectedDate}
				/>
			</YStack>
		</SafeAreaView>
	);
}
