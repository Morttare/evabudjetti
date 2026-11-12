import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Category, Persisted } from '../dataModel';
import { db } from '../db/client';
import * as schema from '../db/schema';

interface CategoryStore {
	categories: Persisted<Category>[];
	loading: boolean;
	initialized: boolean;
	error: string | null;
	nextId: number;
	addCategory: (category: Category) => Promise<void>;
	removeCategory: (id: number) => Promise<void>;
}

const getNextId = (categories: Persisted<Category>[]): number =>
	Math.max(0, ...categories.map((category) => category.id)) + 1;

const toCategory = (
	category: typeof schema.categories.$inferSelect,
): Persisted<Category> => ({
	id: category.id,
	name: category.name,
	type: category.type,
	color: category.color ?? undefined,
	icon: category.icon ?? undefined,
});

export const useCategoryStore = create<CategoryStore>()(
	persist(
		(set, get) => ({
			categories: [],
			loading: false,
			initialized: false,
			error: null,
			nextId: 1,

			addCategory: async (category) => {
				set({ loading: true, error: null });
				try {
					let inserted: Persisted<Category>;
					if (Platform.OS === 'web') {
						inserted = { ...category, id: get().nextId };
					} else {
						const [row] = await db
							.insert(schema.categories)
							.values({
								...category,
								color: category.color ?? null,
								icon: category.icon ?? null,
							})
							.returning();
						inserted = toCategory(row);
					}

					set((state) => {
						const categories = [...state.categories, inserted];
						return {
							categories,
							nextId: getNextId(categories),
							loading: false,
						};
					});
				} catch (error) {
					console.error('Failed to add category:', error);
					set({
						error: 'Failed to add category',
						loading: false,
					});
					throw error;
				}
			},

			removeCategory: async (id) => {
				set({ loading: true, error: null });
				try {
					if (id === 0) {
						throw new Error(
							'Cannot remove the uncategorized category',
						);
					}

					if (Platform.OS !== 'web') {
						await db
							.delete(schema.categories)
							.where(eq(schema.categories.id, id));
					}

					set((state) => {
						const categories = state.categories.filter(
							(category) => category.id !== id,
						);
						return {
							categories,
							nextId: getNextId(categories),
							loading: false,
						};
					});
				} catch (error) {
					console.error('Failed to remove category:', error);
					set({
						error: 'Failed to remove category',
						loading: false,
					});
					throw error;
				}
			},
		}),
		{
			name: 'categories-storage',
			storage: createJSONStorage(() => AsyncStorage),
			version: 1,
		},
	),
);

export async function initializeCategoryStore(): Promise<void> {
	const store = useCategoryStore;
	store.setState({ loading: true, error: null });

	try {
		await store.persist.rehydrate();

		if (Platform.OS === 'web') {
			store.setState({ initialized: true, loading: false });
			return;
		}

		const legacyCategories = store.getState().categories;

		await db
			.insert(schema.categories)
			.values({
				id: 0,
				name: 'Uncategorized',
				type: 'expense',
				color: null,
				icon: null,
			})
			.onConflictDoNothing();

		let databaseCategories = await db.select().from(schema.categories);

		for (const legacyCategory of legacyCategories) {
			if (legacyCategory.id === 0) continue;

			const sameId = databaseCategories.find(
				(category) =>
					category.id === legacyCategory.id &&
					category.name === legacyCategory.name &&
					category.type === legacyCategory.type,
			);
			if (sameId) continue;

			const sameCategory = databaseCategories.filter(
				(category) =>
					category.name === legacyCategory.name &&
					category.type === legacyCategory.type,
			);
			let categoryId: number;

			if (sameCategory.length === 1) {
				categoryId = sameCategory[0].id;
			} else {
				const [inserted] = await db
					.insert(schema.categories)
					.values({
						name: legacyCategory.name,
						type: legacyCategory.type,
						color: legacyCategory.color ?? null,
						icon: legacyCategory.icon ?? null,
					})
					.returning({ id: schema.categories.id });
				categoryId = inserted.id;
				databaseCategories = await db.select().from(schema.categories);
			}

			if (categoryId !== legacyCategory.id) {
				await db
					.update(schema.plannedTransactions)
					.set({ categoryId })
					.where(
						eq(
							schema.plannedTransactions.categoryId,
							legacyCategory.id,
						),
					);
				await db
					.update(schema.realTransactions)
					.set({ categoryId })
					.where(
						eq(
							schema.realTransactions.categoryId,
							legacyCategory.id,
						),
					);
			}
		}

		const categories = (
			await db
				.select()
				.from(schema.categories)
				.orderBy(schema.categories.id)
		)
			.filter((category) => category.id !== 0)
			.map(toCategory);
		store.setState({
			categories,
			nextId: getNextId(categories),
			initialized: true,
		});
	} catch (error) {
		console.error('Failed to initialize categories:', error);
		store.setState({
			error: 'Failed to initialize categories',
			initialized: false,
		});
		throw error;
	} finally {
		store.setState({ loading: false });
	}
}
