CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`amount` real NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_category_id_unique` ON `budgets` (`category_id`);