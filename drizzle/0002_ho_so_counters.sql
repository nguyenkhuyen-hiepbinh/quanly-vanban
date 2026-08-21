CREATE TABLE `ho_so_counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department_id` integer NOT NULL REFERENCES departments(id),
	`year` integer NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ho_so_counters_dept_year_unique` ON `ho_so_counters` (`department_id`,`year`);
