ALTER TABLE `forks` ADD `upstream_branch` text;--> statement-breakpoint
ALTER TABLE `forks` ADD `status` text DEFAULT 'unchecked' NOT NULL;--> statement-breakpoint
ALTER TABLE `forks` ADD `ahead_by` integer;--> statement-breakpoint
ALTER TABLE `forks` ADD `behind_by` integer;--> statement-breakpoint
ALTER TABLE `forks` ADD `last_error` text;--> statement-breakpoint
ALTER TABLE `forks` ADD `last_checked_at` integer;--> statement-breakpoint
ALTER TABLE `forks` ADD `last_sync_type` text;