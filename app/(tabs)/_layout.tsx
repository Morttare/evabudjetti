import {
	ChartColumn,
	Euro,
	Home,
	Settings,
	Wallet,
} from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'tamagui';

interface BottomNavOption {
	icon: ReactElement;
	name: string;
	route: string;
}

export default function TabLayout() {
	const theme = useTheme();
	const { t } = useTranslation();

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
			screenOptions={{
				tabBarStyle: { backgroundColor: theme.primary100.val },
				tabBarActiveBackgroundColor: theme.primary200.val,
				tabBarLabelStyle: { color: theme.white.val },

				headerTitleAlign: 'center',
				headerTitleStyle: {
					color: theme.primary100.val,
					fontFamily: 'FiraSans_400Regular',
					fontSize: 26,
					fontWeight: 'bold',
					paddingBottom: 5,
				},
				
			}}
		>
			{bottomNavOptions.map((page) => (
				<Tabs.Screen
					key={page.route}
					name={page.route}
					options={{
						title: page.name,
						tabBarIcon: () => page.icon,
						headerTitle: page.name,
					}}
				/>
			))}
		</Tabs>
	);
}
