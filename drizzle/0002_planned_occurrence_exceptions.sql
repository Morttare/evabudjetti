-- Store per-date skips and retain the original scheduled date for moved transactions.
CREATE TABLE `planned_transaction_occurrence_exceptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`planned_transaction_id` integer NOT NULL,
	`occurrence_date` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planned_occurrence_unique` ON `planned_transaction_occurrence_exceptions` (`planned_transaction_id`,`occurrence_date`);--> statement-breakpoint
ALTER TABLE `real_transactions` ADD `planned_occurrence_date` integer;