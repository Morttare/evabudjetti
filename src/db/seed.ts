import { gt } from 'drizzle-orm';
import { Platform } from 'react-native';
import { DEFAULT_ACCOUNT_ID, DEFAULT_BUDGET_ID } from '../dataModel';
import { db } from './client';
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
		// Check if categories exist
		const existing = await db
			.select()
			.from(categories)
			.where(gt(categories.id, 0))
			.limit(1);

		if (existing.length > 0) {
			return;
		}

		console.log('Seeding default categories...');

		const defaultCategories = [
			{ name: 'Living', type: 'expense', color: '#FF5733', icon: 'home' },
			{
				name: 'Groceries',
				type: 'expense',
				color: '#33FF57',
				icon: 'cart',
			},
			{ name: 'Salary', type: 'income', color: '#3357FF', icon: 'cash' },
			{
				name: 'Benefits',
				type: 'income',
				color: '#FF33A1',
				icon: 'gift',
			},
		] as const;

		await db.insert(categories).values(
			defaultCategories.map((cat) => ({
				name: cat.name,
				type: cat.type,
				color: cat.color,
				icon: cat.icon,
			})),
		);

		console.log('Default categories seeded successfully');
	} catch (error) {
		console.error('Error seeding categories:', error);
	}
};
