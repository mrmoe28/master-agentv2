CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`parent_id` text,
	`project_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`image_urls` text,
	`file_attachments` text,
	`timestamp` text NOT NULL,
	`agent_id` text,
	`thoughts` text,
	`tool_calls` text,
	`is_streaming` integer
);
--> statement-breakpoint
CREATE TABLE `history_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`session_id` text NOT NULL,
	`query` text NOT NULL,
	`summary` text NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text NOT NULL,
	`agent_id` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `memory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL,
	`score` integer,
	`timestamp` text NOT NULL,
	`source` text
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`goals` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`agent_id` text NOT NULL,
	`project_id` text NOT NULL,
	`result` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
