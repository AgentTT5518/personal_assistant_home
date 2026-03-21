CREATE TABLE `import_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`account_id` text,
	`column_mapping` text,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`imported_rows` integer DEFAULT 0 NOT NULL,
	`duplicate_rows` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `split_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_transaction_id` text NOT NULL,
	`category_id` text,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6b7280',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `transaction_tags` (
	`transaction_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_tags_unique` ON `transaction_tags` (`transaction_id`,`tag_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`import_session_id` text,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` text,
	`merchant` text,
	`is_recurring` integer DEFAULT false,
	`is_split` integer DEFAULT false,
	`previous_category_id` text,
	`account_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_session_id`) REFERENCES `import_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "document_id", "import_session_id", "date", "description", "amount", "type", "category_id", "merchant", "is_recurring", "is_split", "previous_category_id", "account_id", "created_at", "updated_at") SELECT "id", "document_id", "import_session_id", "date", "description", "amount", "type", "category_id", "merchant", "is_recurring", "is_split", "previous_category_id", "account_id", "created_at", "updated_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;