CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	`category_id` text,
	`type` text NOT NULL,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`recurrence_interval` integer,
	`is_planned` integer DEFAULT false NOT NULL
);
