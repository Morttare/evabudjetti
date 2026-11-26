import {
	ChartColumn,
	Euro,
	Home,
	Settings,
	Wallet,
} from '@tamagui/lucide-icons';
import { Tabs, useSegments } from 'expo-router';
import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { useTheme } from 'tamagui';

interface BottomNavOption {
	icon: ReactElement;
	name: string;
	route: string;
}

export default function TabLayout() {
	const theme = useTheme();
	const { t } = useTranslation();
	const segments = useSegments();

	useEffect(() => {
		const subscription = BackHandler.addEventListener(
			'hardwareBackPress',
			() => segments[0] === '(tabs)',
		);
		return () => subscription.remove();
	}, [segments]);

	const bottomNavOptions: BottomNavOption[] = [
		{
			icon: <Home size={'$icons.md'} color={theme.white.val} />,
			name: t('Home'),
			route: 'index',
		},
		{
			icon: <Wallet size={'$icons.md'} color={theme.white.val} />,
			name: t('Funds'),
			route: 'funds',
		},
		{
			icon: <Euro size={'$icons.md'} color={theme.white.val} />,
			name: t('Budget'),
			route: 'budget',
		},
		{
			icon: <ChartColumn size={'$icons.md'} color={theme.white.val} />,
			name: t('Summary'),
			route: 'summary',
		},
		{
			icon: <Settings size={'$icons.md'} color={theme.white.val} />,
			name: t('Settings'),
			route: 'settings',
		},
	];
	return (
		<Tabs
			backBehavior="none"
			screenOptions={{
				tabBarStyle: { backgroundColor: theme.primary100.val },
				tabBarActiveBackgroundColor: theme.primary200.val,
				tabBarLabelStyle: { color: theme.white.val },
			}}
		>
			{bottomNavOptions.map((page) => (
				<Tabs.Screen
					key={page.route}
					name={page.route}
					options={{
						title: page.name,
						tabBarIcon: () => page.icon,
						headerTitle: '',
						headerShown: page.route !== 'index',
					}}
				/>
			))}
		</Tabs>
	);
}
