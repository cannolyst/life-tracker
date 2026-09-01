CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "year_review_item_people" (
	"item_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "year_review_item_people_item_id_person_id_pk" PRIMARY KEY("item_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD CONSTRAINT "year_review_item_people_item_id_year_review_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."year_review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD CONSTRAINT "year_review_item_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;