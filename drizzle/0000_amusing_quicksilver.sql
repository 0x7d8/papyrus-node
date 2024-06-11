CREATE TABLE `builds` (
	`id` integer PRIMARY KEY NOT NULL,
	`version_id` integer NOT NULL,
	`ready` integer NOT NULL,
	`file_extension` text NOT NULL,
	`build` text NOT NULL,
	`result` text NOT NULL,
	`timestamp` integer NOT NULL,
	`duration` integer,
	`md5` text(32) NOT NULL,
	`sha256` text(64) NOT NULL,
	`sha512` text(128) NOT NULL,
	`commits` text NOT NULL,
	`flags` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);