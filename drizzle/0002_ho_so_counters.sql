CREATE TABLE `so_departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ho_so_counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`so_department_id` integer NOT NULL REFERENCES so_departments(id),
	`year` integer NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ho_so_counters_dept_year_unique` ON `ho_so_counters` (`so_department_id`,`year`);
--> statement-breakpoint
ALTER TABLE `documents` ADD `so_department_id` integer REFERENCES so_departments(id);
