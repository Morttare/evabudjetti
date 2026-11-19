import { Platform } from 'react-native';
import { DEFAULT_ACCOUNT_ID, DEFAULT_BUDGET_ID } from '../dataModel';
import { db } from './client';
import { DEFAULT_CATEGORIES } from './defaultCategories';
import { accounts, budgets, categories } from './schema';

export const seedDefaultBudgetAndAccount = async () => {
	if (Platform.OS === 'web') return;

	try {
		const existingBudgets = await db.select().from(budgets).limit(1);
		if (existingBudgets.length === 0) {
			await db
				.insert(budgets)
				.values({ id: DEFAULT_BUDGET_ID, name: 'Default Budget' });
		}

		const existingAccounts = await db.select().from(accounts).limit(1);
		if (existingAccounts.length === 0) {
			await db.insert(accounts).values({
				id: DEFAULT_ACCOUNT_ID,
				budgetId: DEFAULT_BUDGET_ID,
				name: 'Default Account',
			});
		}
	} catch (error) {
		console.error('Error seeding default budget and account:', error);
	}
};

export const seedCategories = async () => {
	if (Platform.OS === 'web') return;

	try {
		await db.transaction(async (tx) => {
			await tx
				.insert(categories)
				.values({
					id: 0,
					name: 'Uncategorized',
					type: 'expense',
					color: null,
					icon: null,
				})
				.onConflictDoNothing();

			const databaseCategories = await tx.select().from(categories);
			for (const defaultCategory of DEFAULT_CATEGORIES) {
				const exists = databaseCategories.some(
					(category) =>
						category.name === defaultCategory.name &&
						category.type === defaultCategory.type,
				);
				if (exists) continue;

				const [inserted] = await tx
					.insert(categories)
					.values(defaultCategory)
					.returning();
				databaseCategories.push(inserted);
			}
		});

		console.log('Default categories seeded successfully');
	} catch (error) {
		console.error('Error seeding categories:', error);
	}
};
