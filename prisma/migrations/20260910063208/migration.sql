-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_user_id_fkey";

-- DropForeignKey
ALTER TABLE "billing" DROP CONSTRAINT "billing_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_denominations" DROP CONSTRAINT "booking_denominations_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_payments" DROP CONSTRAINT "booking_payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_property_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_reports_to_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_messages" DROP CONSTRAINT "notification_messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_billing_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_property_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_triggered_by_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "top_performers" DROP CONSTRAINT "top_performers_member_id_fkey";

-- AlterTable
ALTER TABLE "billing" ALTER COLUMN "cheque_date" SET DATA TYPE TIMESTAMP(3);
