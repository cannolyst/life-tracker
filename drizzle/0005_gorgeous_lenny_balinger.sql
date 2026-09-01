CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "year_review_item_places" (
	"item_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	CONSTRAINT "year_review_item_places_item_id_place_id_pk" PRIMARY KEY("item_id","place_id")
);
--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD CONSTRAINT "year_review_item_places_item_id_year_review_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."year_review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD CONSTRAINT "year_review_item_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;