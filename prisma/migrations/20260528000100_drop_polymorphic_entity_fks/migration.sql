ALTER TABLE "public"."workflow_history" DROP CONSTRAINT IF EXISTS "wh_billing_fk";
ALTER TABLE "public"."workflow_history" DROP CONSTRAINT IF EXISTS "wh_booking_fk";
ALTER TABLE "public"."workflow_history" DROP CONSTRAINT IF EXISTS "wh_property_fk";

ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "doc_admin_fk";
ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "doc_billing_fk";
ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "doc_booking_fk";
ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "doc_member_fk";
ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "doc_property_fk";
