ALTER TABLE "profiles" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "twitter_handle" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_email" boolean DEFAULT false NOT NULL;