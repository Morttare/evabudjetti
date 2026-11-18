import { eq, inArray, sql } from 'drizzle-orm';
import { Platform } from 'react-native';
import { DEFAULT_ACCOUNT_ID, DEFAULT_BUDGET_ID } from '../dataModel';
import { db } from './client';
import { DEFAULT_CATEGORIES } from './defaultCategories';
import * as schema from './schema';
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
		// Match the old defaults by their original metadata so user-created
		// categories with the same names are not renamed.
		const previousDefaults = [
			{
				name: 'Living',
				type: 'expense',
				color: '#FF5733',
				icon: 'home',
				replacement: 'Asuminen/Living',
			},
			{
				name: 'Groceries',
				type: 'expense',
				color: '#33FF57',
				icon: 'cart',
				replacement: 'Ruoka/Food',
			},
			{
				name: 'Benefits',
				type: 'income',
				color: '#FF33A1',
				icon: 'gift',
				replacement: 'Etuudet/Benefits',
			},
		] as const;

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
			const idMappings: [number, number][] = [];

			for (const previousDefault of previousDefaults) {
				const oldCategory = databaseCategories.find(
					(category) =>
						category.name === previousDefault.name &&
						category.type === previousDefault.type &&
						category.color === previousDefault.color &&
						category.icon === previousDefault.icon,
				);
				if (!oldCategory) continue;

				const replacement = databaseCategories.find(
					(category) =>
						category.name === previousDefault.replacement &&
						category.type === previousDefault.type,
				);
				if (replacement) {
					idMappings.push([oldCategory.id, replacement.id]);
					databaseCategories.splice(
						databaseCategories.indexOf(oldCategory),
						1,
					);
				} else {
					await tx
						.update(categories)
						.set({ name: previousDefault.replacement })
						.where(eq(categories.id, oldCategory.id));
					oldCategory.name = previousDefault.replacement;
				}
			}

			const removedDefaults = [
				{
					name: 'Salary',
					type: 'income',
					color: '#3357FF',
					icon: 'cash',
				},
				{
					name: 'Muu',
					type: 'expense',
					color: undefined,
					icon: undefined,
				},
				{
					name: 'Muu',
					type: 'income',
					color: undefined,
					icon: undefined,
				},
				{
					name: 'muu',
					type: 'expense',
					color: undefined,
					icon: undefined,
				},
				{
					name: 'muu',
					type: 'income',
					color: undefined,
					icon: undefined,
				},
				{
					name: 'Muu/Other',
					type: 'expense',
					color: undefined,
					icon: undefined,
				},
				{
					name: 'Muu/Other',
					type: 'income',
					color: undefined,
					icon: undefined,
				},
			] as const;

			// Collapse legacy Muu categories into the shared Other category (ID 0).
			for (const removedDefault of removedDefaults) {
				const oldCategories = databaseCategories.filter(
					(category) =>
						category.name === removedDefault.name &&
						category.type === removedDefault.type &&
						(removedDefault.color === undefined ||
							category.color === removedDefault.color) &&
						(removedDefault.icon === undefined ||
							category.icon === removedDefault.icon),
				);

				for (const oldCategory of oldCategories) {
					idMappings.push([oldCategory.id, 0]);
					databaseCategories.splice(
						databaseCategories.indexOf(oldCategory),
						1,
					);
				}
			}

			for (const defaultCategory of DEFAULT_CATEGORIES) {
				const alreadyExists = databaseCategories.some(
					(category) =>
						category.name === defaultCategory.name &&
						category.type === defaultCategory.type,
				);
				if (alreadyExists) continue;

				const [inserted] = await tx
					.insert(categories)
					.values(defaultCategory)
					.returning();
				databaseCategories.push(inserted);
			}

			if (idMappings.length === 0) return;

			const cases = sql.join(
				idMappings.map(
					([oldId, newId]) => sql`WHEN ${oldId} THEN ${newId}`,
				),
				sql` `,
			);
			const oldIds = idMappings.map(([oldId]) => oldId);

			await tx
				.update(schema.plannedTransactions)
				.set({
					categoryId: sql`CASE ${schema.plannedTransactions.categoryId} ${cases} ELSE ${schema.plannedTransactions.categoryId} END`,
				})
				.where(inArray(schema.plannedTransactions.categoryId, oldIds));
			await tx
				.update(schema.realTransactions)
				.set({
					categoryId: sql`CASE ${schema.realTransactions.categoryId} ${cases} ELSE ${schema.realTransactions.categoryId} END`,
				})
				.where(inArray(schema.realTransactions.categoryId, oldIds));
			await tx.delete(categories).where(inArray(categories.id, oldIds));
		});

		console.log('Default categories seeded successfully');
	} catch (error) {
		console.error('Error seeding categories:', error);
	}
};
