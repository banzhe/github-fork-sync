CREATE TABLE `forks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`branch` text DEFAULT 'main' NOT NULL,
	`upstream` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forks_owner_repo_branch_idx` ON `forks` (`owner`,`repo`,`branch`);