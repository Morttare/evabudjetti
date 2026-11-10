import { Stack } from 'expo-router';

export default function SummaryStackLayout() {
	return (
		<Stack
			screenOptions={{
				headerShadowVisible: false,
				headerStyle: { backgroundColor: '#f2f2f2' },
				headerLargeTitle: false,
				headerTitleAlign: 'center',
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
		</Stack>
	);
}
