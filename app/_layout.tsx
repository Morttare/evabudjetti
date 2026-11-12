import { TamaguiProvider, Theme } from '@tamagui/core';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalProvider, Spinner, Text, YStack } from 'tamagui';
import migrations from '@/drizzle/migrations';
import { db, isDbReal } from '@/src/db/client';
import { seedCategories, seedDefaultBudgetAndAccount } from '@/src/db/seed';
import {
	initializeCategoryStore,
	useCategoryStore,
} from '@/src/store/categoryStore';
import config from '../tamagui.config';
import '@/src/utils/i18n';

import { Redirect } from 'expo-router';
import i18next from 'i18next';
import { useEffect } from 'react';
import { useInstructionStore } from '@/src/store/useInstructionStore';
import { useLanguageStore } from '@/src/store/useLanguageStore';

export default function RootLayout() {
	const { success, error } = useMigrations(db, migrations);
	const categoriesInitialized = useCategoryStore(
		(state) => state.initialized,
	);
	const categoryError = useCategoryStore((state) => state.error);

	useEffect(() => {
		if (success && isDbReal && !categoriesInitialized && !categoryError) {
			void (async () => {
				await seedDefaultBudgetAndAccount();
				await seedCategories();
				await initializeCategoryStore();
			})().catch((initializationError) => {
				console.error(
					'Failed to initialize app data:',
					initializationError,
				);
			});
		}
	}, [success, categoriesInitialized, categoryError]);

	const language = useLanguageStore((state) => state.language);
	const { instructionShown } = useInstructionStore();

	useEffect(() => {
		if (language && i18next.language !== language) {
			i18next.changeLanguage(language);
		}
	}, [language]);

	if (!instructionShown) {
		return (
			<TamaguiProvider config={config} defaultTheme="light">
				<PortalProvider>
					<Theme name="light">
						<SafeAreaProvider>
							<StatusBar style="dark" translucent={false} />
							<Stack
								screenOptions={{
									headerBackButtonDisplayMode: 'minimal',
									headerTitle: '',
								}}
							>
								<Stack.Screen name="landing" />
								<Stack.Screen name="introduction" />
								<Stack.Screen name="budget_wizard" />
							</Stack>
							<Redirect href="/landing" />
						</SafeAreaProvider>
					</Theme>
				</PortalProvider>
			</TamaguiProvider>
		);
	}

	if (isDbReal && success && categoryError && !categoriesInitialized) {
		return (
			<TamaguiProvider config={config} defaultTheme="light">
				<Theme name="light">
					<SafeAreaProvider>
						<YStack f={1} jc="center" ai="center" padding="$4">
							<YStack gap="$3" ai="center">
								<Text
									color="$danger500"
									fontSize="$6"
									fontWeight="bold"
								>
									Category Data Error
								</Text>
								<Text color="$danger500" ta="center">
									{categoryError}
								</Text>
							</YStack>
						</YStack>
					</SafeAreaProvider>
				</Theme>
			</TamaguiProvider>
		);
	}

	if (isDbReal && success && !categoriesInitialized && !categoryError) {
		return (
			<TamaguiProvider config={config} defaultTheme="light">
				<Theme name="light">
					<SafeAreaProvider>
						<YStack f={1} jc="center" ai="center">
							<Spinner size="large" color="$info500" />
						</YStack>
					</SafeAreaProvider>
				</Theme>
			</TamaguiProvider>
		);
	}

	if (isDbReal) {
		if (error) {
			return (
				<TamaguiProvider config={config} defaultTheme="light">
					<Theme name="light">
						<SafeAreaProvider>
							<YStack f={1} jc="center" ai="center" padding="$4">
								<YStack gap="$3" ai="center">
									<Text
										color="$danger500"
										fontSize="$6"
										fontWeight="bold"
									>
										Migration Error
									</Text>
									<Text color="$danger500" ta="center">
										{error.message}
									</Text>
									<Text
										color="$info500"
										ta="center"
										fontSize="$3"
									>
										Please reset your app data and try
										again.
									</Text>
								</YStack>
							</YStack>
						</SafeAreaProvider>
					</Theme>
				</TamaguiProvider>
			);
		}

		if (!success) {
			return (
				<TamaguiProvider config={config} defaultTheme="light">
					<Theme name="light">
						<SafeAreaProvider>
							<YStack f={1} jc="center" ai="center">
								<Spinner size="large" color="$info500" />
							</YStack>
						</SafeAreaProvider>
					</Theme>
				</TamaguiProvider>
			);
		}
	}

	return (
		<TamaguiProvider config={config} defaultTheme={'light'}>
			{/* PortalProvider is neseccary for Tamagui Dialog components */}
			<PortalProvider>
				<Theme name={'light'}>
					<SafeAreaProvider>
						<StatusBar style="dark" translucent={false} />
						<Stack
							screenOptions={{
								headerBackButtonDisplayMode: 'minimal',
								headerTitle: '',
							}}
						>
							<Stack.Screen
								name="(tabs)"
								options={{
									headerShown: false,
									headerBackButtonDisplayMode: 'minimal',
									headerTitle: '',
								}}
							/>
						</Stack>
					</SafeAreaProvider>
				</Theme>
			</PortalProvider>
		</TamaguiProvider>
	);
}
