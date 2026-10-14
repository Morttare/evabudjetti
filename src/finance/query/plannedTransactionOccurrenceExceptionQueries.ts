import { endOfMonth } from 'date-fns/endOfMonth';
import { and, gte, lte } from 'drizzle-orm';
import type {
	MonthInstance,
	PlannedTransactionOccurrenceException,
} from '@/src/dataModel';
import { db } from '@/src/db/client';
import * as schema from '@/src/db/schema';

/** Loads skipped scheduled dates so range generation excludes only those instances. */
export async function fetchPlannedTransactionOccurrenceExceptionsByDateRange(
	start: MonthInstance,
	end: MonthInstance,
): Promise<PlannedTransactionOccurrenceException[]> {
	return db
		.select({
			plannedTransactionId:
				schema.plannedTransactionOccurrenceExceptions
					.plannedTransactionId,
			occurrenceDate:
				schema.plannedTransactionOccurrenceExceptions.occurrenceDate,
		})
		.from(schema.plannedTransactionOccurrenceExceptions)
		.where(
			and(
				gte(
					schema.plannedTransactionOccurrenceExceptions
						.occurrenceDate,
					new Date(start.year, start.month, 1),
				),
				lte(
					schema.plannedTransactionOccurrenceExceptions
						.occurrenceDate,
					endOfMonth(new Date(end.year, end.month, 1)),
				),
			),
		);
}
