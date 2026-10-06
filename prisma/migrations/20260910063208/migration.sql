-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT IF EXISTS "admins_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT IF EXISTS "admins_user_id_fkey";

-- DropForeignKey
ALTER TABLE "billing" DROP CONSTRAINT IF EXISTS "billing_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_denominations" DROP CONSTRAINT IF EXISTS "booking_denominations_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_payments" DROP CONSTRAINT IF EXISTS "booking_payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_property_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_reports_to_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_messages" DROP CONSTRAINT IF EXISTS "notification_messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT IF EXISTS "notification_recipients_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT IF EXISTS "notification_recipients_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_billing_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_property_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_triggered_by_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "top_performers" DROP CONSTRAINT IF EXISTS "top_performers_member_id_fkey";

-- AlterTable
ALTER TABLE "billing" ALTER COLUMN "cheque_date" SET DATA TYPE TIMESTAMP(3);
