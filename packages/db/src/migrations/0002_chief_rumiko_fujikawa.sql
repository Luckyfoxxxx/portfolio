PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_news_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`headline` text NOT NULL,
	`url` text NOT NULL,
	`source` text,
	`published_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "url_is_http" CHECK("__new_news_items"."url" LIKE 'http://%' OR "__new_news_items"."url" LIKE 'https://%'),
	CONSTRAINT "headline_max_len" CHECK(length("__new_news_items"."headline") <= 512),
	CONSTRAINT "source_max_len" CHECK("__new_news_items"."source" IS NULL OR length("__new_news_items"."source") <= 128)
);
--> statement-breakpoint
INSERT INTO `__new_news_items`("id", "symbol", "headline", "url", "source", "published_at", "created_at") SELECT "id", "symbol", "headline", "url", "source", "published_at", "created_at" FROM `news_items`;--> statement-breakpoint
DROP TABLE `news_items`;--> statement-breakpoint
ALTER TABLE `__new_news_items` RENAME TO `news_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;