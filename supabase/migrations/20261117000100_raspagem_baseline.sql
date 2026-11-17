-- Baseline das dez tabelas de raspagem (Raspagem-Farol), transportado como DDL puro.
-- Gerado por scripts/migracao/gerar-baseline.ts — não editar à mão; regenerar.
-- Qualquer alteração de coluna/default/constraint na origem quebra o teste de baseline.
-- Fontes (SHA-256 dos arquivos de origem):
--   0000_extensions.sql 616bc0036bb4f1626b8031e0bfac361faa361e414a950d517059392674a02bc1
--   0001_sources_table.sql ad8ed45213ab04ecdeaead75cc75f9dda37511a8725e9b2ed2282ec1dfa881b4
--   0002_events_and_full_schema.sql 09765010eb3687de6ebfb96618389a8a434ac8e7fe4084d2b85eb7ceb769f182
--   0003_users_auth_fields.sql 25cee7c8202789e9f4942d79f1c4bcbabb26af2823da97755b8259fac652d28f
--   0004_sympla_collection.sql f9381fb1c3ee672815c17d6e1b2f956126856ae591c3db93a4f6dcf86b08fb5c
-- Enable optional search-enhancing extensions used by later phases
-- (accent-insensitive / fuzzy text search over event/source names).
-- Confirmed to succeed against the postgres:16-alpine test image used by
-- docker-compose.test.yaml (see NOTES.md for the full verification record).
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);

CREATE TABLE "connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"type" text NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connectors_type_check" CHECK ("connectors"."type" IN ('crawler', 'api'))
);

CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"description" text,
	"normalized_title" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"venue_name" text,
	"venue_address" text,
	"venue_raw" jsonb,
	"is_free" boolean DEFAULT false NOT NULL,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"price_raw" jsonb,
	"avatar_url" text,
	"raw_json" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"space_match_status" text DEFAULT 'unmatched' NOT NULL,
	"space_match_at" timestamp with time zone,
	"space_match_error" jsonb,
	"curation_status" text DEFAULT 'pending' NOT NULL,
	"curation_at" timestamp with time zone,
	"curation_error" jsonb,
	"export_status" text DEFAULT 'not_exported' NOT NULL,
	"export_at" timestamp with time zone,
	"export_error" jsonb,
	"mapas_import_status" text DEFAULT 'not_reported' NOT NULL,
	"mapas_import_at" timestamp with time zone,
	"mapas_import_error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_source_id_external_id_unique" UNIQUE("source_id","external_id"),
	CONSTRAINT "events_space_match_status_check" CHECK ("events"."space_match_status" IN ('unmatched', 'suggested', 'matched')),
	CONSTRAINT "events_curation_status_check" CHECK ("events"."curation_status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "events_export_status_check" CHECK ("events"."export_status" IN ('not_exported', 'exported')),
	CONSTRAINT "events_mapas_import_status_check" CHECK ("events"."mapas_import_status" IN ('not_reported', 'confirmed', 'failed'))
);

CREATE TABLE "spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"mapas_space_id" text NOT NULL,
	"source_name" text,
	"normalized_name" text NOT NULL,
	"municipality" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_mapas_space_id_unique" UNIQUE("mapas_space_id")
);

CREATE TABLE "event_space_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"space_id" integer NOT NULL,
	"score" numeric(6, 4) NOT NULL,
	"rank" integer NOT NULL,
	"algorithm_version" text NOT NULL,
	"curator_decision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_space_candidates_curator_decision_check" CHECK ("event_space_candidates"."curator_decision" IS NULL OR "event_space_candidates"."curator_decision" IN ('accepted', 'rejected'))
);

CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"source_id" integer,
	"status" text DEFAULT 'running' NOT NULL,
	"owner" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"counters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" jsonb,
	"lock_key" text,
	CONSTRAINT "job_runs_status_check" CHECK ("job_runs"."status" IN ('running', 'succeeded', 'failed', 'skipped'))
);

CREATE TABLE "exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"csv_content_base64" text,
	"checksum_sha256" text NOT NULL,
	"schema_version" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exports_status_check" CHECK ("exports"."status" IN ('pending', 'completed', 'failed'))
);

CREATE TABLE "export_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"export_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "login_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"request_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "sources" ADD COLUMN "kind" text DEFAULT 'unknown' NOT NULL;
ALTER TABLE "sources" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_space_candidates" ADD CONSTRAINT "event_space_candidates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_space_candidates" ADD CONSTRAINT "event_space_candidates_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "export_items" ADD CONSTRAINT "export_items_export_id_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."exports"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "export_items" ADD CONSTRAINT "export_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "login_tokens" ADD CONSTRAINT "login_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "users" ADD COLUMN "display_name" text;
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'curator' NOT NULL;
ALTER TABLE "job_runs" DROP CONSTRAINT "job_runs_status_check";
ALTER TABLE "events" ADD COLUMN "city" text;
ALTER TABLE "events" ADD COLUMN "modality" text;
ALTER TABLE "events" ADD COLUMN "collection_status" text;
ALTER TABLE "events" ADD COLUMN "collection_reason" text;
ALTER TABLE "events" ADD COLUMN "last_collected_at" timestamp with time zone;
ALTER TABLE "job_runs" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "events" ADD CONSTRAINT "events_modality_check" CHECK ("events"."modality" IS NULL OR "events"."modality" IN ('in_person', 'online', 'unknown'));
ALTER TABLE "events" ADD CONSTRAINT "events_collection_status_check" CHECK ("events"."collection_status" IS NULL OR "events"."collection_status" IN ('included', 'excluded', 'incomplete'));
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_status_check" CHECK ("job_runs"."status" IN ('running', 'succeeded', 'partial', 'failed', 'skipped'));