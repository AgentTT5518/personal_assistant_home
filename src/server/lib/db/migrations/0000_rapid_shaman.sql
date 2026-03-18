CREATE TABLE `account_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`opening_balance` real,
	`closing_balance` real,
	`total_credits` real,
	`total_debits` real,
	`currency` text DEFAULT 'AUD',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`task_type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`fallback_provider` text,
	`fallback_model` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_settings_task_type_unique` ON `ai_settings` (`task_type`);--> statement-breakpoint
CREATE TABLE `analysis_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_type` text NOT NULL,
	`data` text NOT NULL,
	`generated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`color` text,
	`icon` text,
	`is_default` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`pattern` text NOT NULL,
	`field` text DEFAULT 'description' NOT NULL,
	`is_ai_generated` integer DEFAULT false,
	`confidence` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`doc_type` text NOT NULL,
	`institution` text,
	`period` text,
	`processing_status` text DEFAULT 'pending' NOT NULL,
	`processed_at` text,
	`raw_extraction` text,
	`extracted_text` text,
	`file_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` text,
	`merchant` text,
	`is_recurring` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
