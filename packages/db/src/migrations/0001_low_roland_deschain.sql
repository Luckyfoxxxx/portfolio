CREATE TABLE `cron_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`symbols_attempted` integer NOT NULL,
	`symbols_refreshed` integer NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` integer DEFAULT 0 NOT NULL;