import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { Category, Persisted } from '../dataModel';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { useBalanceVersioning } from '../finance/versioning/balanceVersioning';
import { useTransactionOccurrenceVersioning } from '../finance/versioning/transactionOccurrenceVersioning';

const CATEGORY_STORAGE_KEY = 'categories-storage';

interface CategoryStore {
	categories: Persisted<Category>[];
	loading: boolean;
	initialized: boolean;
	error: string | null;
	addCategory: (category: Category) => Promise<Persisted<Category>>;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

function parseStoredCategories(value: string): Persisted<Category>[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch (error) {
		throw new Error('Stored categories are not valid JSON', {
			cause: error,
		});
	}

	if (!isRecord(parsed) || !isRecord(parsed.state)) {
		throw new Error('Stored categories have an invalid format');
	}

	const categories = parsed.state.categories;
	if (!Array.isArray(categories)) {
		throw new Error('Stored categories list is missing');
	}

	return categories.map((category: unknown) => {
		if (
			!isRecord(category) ||
			typeof category.id !== 'number' ||
			!Number.isInteger(category.id) ||
			typeof category.name !== 'string' ||
			(category.type !== 'income' && category.type !== 'expense')
		) {
			throw new Error('Stored category has an invalid format');
		}

		return {
			id: category.id,
			name: category.name,
			type: category.type,
			color:
				typeof category.color === 'string' ? category.color : undefined,
			icon: typeof category.icon === 'string' ? category.icon : undefined,
		};
	});
}

async function saveWebCategories(
	categories: Persisted<Category>[],
): Promise<void> {
	await AsyncStorage.setItem(
		CATEGORY_STORAGE_KEY,
		JSON.stringify({ state: { categories }, version: 2 }),
	);
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
	categories: [],
	loading: false,
	initialized: false,
	error: null,

	addCategory: async (category) => {
		set({ loading: true, error: null });
		try {
			let inserted: Persisted<Category>;
			if (Platform.OS === 'web') {
				inserted = { ...category, id: getNextId(get().categories) };
			} else {
				// SQLite owns native IDs; Zustand only mirrors rows for reactive UI.
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

			const categories = [...get().categories, inserted];
			if (Platform.OS === 'web') {
				await saveWebCategories(categories);
			}
			set({ categories, loading: false });
			return inserted;
		} catch (error) {
			console.error('Failed to add category:', error);
			set({ error: 'Failed to add category', loading: false });
			throw error;
		}
	},

	removeCategory: async (id) => {
		set({ loading: true, error: null });
		try {
			if (id === 0) {
				throw new Error('Cannot remove the uncategorized category');
			}

			if (Platform.OS !== 'web') {
				await db.transaction(async (tx) => {
					await tx
						.update(schema.plannedTransactions)
						.set({ categoryId: 0 })
						.where(eq(schema.plannedTransactions.categoryId, id));
					await tx
						.update(schema.realTransactions)
						.set({ categoryId: 0 })
						.where(eq(schema.realTransactions.categoryId, id));
					await tx
						.delete(schema.categories)
						.where(eq(schema.categories.id, id));
				});
				useTransactionOccurrenceVersioning
					.getState()
					.invalidateTrackedMonths();
				useBalanceVersioning.getState().invalidateTrackedMonths();
			}

			const categories = get().categories.filter(
				(category) => category.id !== id,
			);
			if (Platform.OS === 'web') {
				await saveWebCategories(categories);
			}
			set({ categories, loading: false });
		} catch (error) {
			console.error('Failed to remove category:', error);
			set({ error: 'Failed to remove category', loading: false });
			throw error;
		}
	},
}));

export async function initializeCategoryStore(): Promise<void> {
	const store = useCategoryStore;
	store.setState({ loading: true, error: null });

	try {
		if (Platform.OS === 'web') {
			// The web database client is a stub, so web keeps AsyncStorage persistence.
			const storedCategories =
				await AsyncStorage.getItem(CATEGORY_STORAGE_KEY);
			const categories = storedCategories
				? parseStoredCategories(storedCategories)
				: [];
			store.setState({ categories, initialized: true });
			return;
		}

		const categories = (
			await db
				.select()
				.from(schema.categories)
				.orderBy(schema.categories.id)
		)
			.filter((category) => category.id !== 0)
			.map(toCategory);
		store.setState({ categories, initialized: true });
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
