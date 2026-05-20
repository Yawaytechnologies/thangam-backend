-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BillingStatus" AS ENUM ('PENDING', 'PARTIAL_PAYMENT', 'PAID', 'FINAL_SETTLEMENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('BOOKING_INITIATED', 'TOKEN_RECEIVED', 'ADVANCE_PAYMENT', 'REGISTRATION_PENDING', 'FINAL_SETTLEMENT_PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('PROFILE_PHOTO', 'AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENSE', 'ADDRESS_PROOF', 'BANK_PASSBOOK', 'PROPERTY_IMAGE', 'LAYOUT_DOCUMENT', 'APPROVAL_DOCUMENT', 'BOOKING_DOCUMENT', 'BILLING_DOCUMENT', 'PAYMENT_RECEIPT', 'SETTLEMENT_DOCUMENT', 'ESTIMATE_COPY', 'BROCHURE');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('BOOKING_FOLLOW_UP', 'BILLING_FOLLOW_UP', 'SETTLEMENT_REMINDER', 'PROPERTY_WORKFLOW_UPDATE', 'DOCUMENT_SUBMISSION_REMINDER', 'GENERAL_MESSAGE');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('UNREAD', 'READ', 'RESOLVED', 'IMPORTANT');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('ADMIN_ACTIVITY', 'MEMBER_ACTIVITY', 'BRANCH_ACTIVITY', 'PROPERTY_ACTIVITY', 'BOOKING_ACTIVITY', 'BILLING_ACTIVITY', 'SYSTEM_ACTIVITY', 'TEAM_ACTIVITY');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'GPAY', 'UPI');

-- CreateEnum
CREATE TYPE "public"."PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'VILLA', 'APARTMENT', 'PLOT');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'DEPUTY_DIRECTOR', 'SENIOR_MANAGER', 'BUSINESS_MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."WorkflowStatus" AS ENUM ('AVAILABLE', 'BOOKING_INITIATED', 'TOKEN_RECEIVED', 'ADVANCE_PAYMENT', 'REGISTRATION_PENDING', 'FINAL_SETTLEMENT_PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing" (
    "id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_address" TEXT,
    "buyer_phone" TEXT NOT NULL,
    "order_number" TEXT,
    "billing_number" TEXT,
    "billing_date" TIMESTAMP(3) NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "amount_in_numbers" DOUBLE PRECISION NOT NULL,
    "amount_in_words" TEXT NOT NULL,
    "total_received" DOUBLE PRECISION NOT NULL,
    "total_balance" DOUBLE PRECISION NOT NULL,
    "operational_notes" TEXT,
    "settlement_notes" TEXT,
    "terms_conditions" TEXT,
    "signature_url" TEXT,
    "status" "public"."BillingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."booking_denominations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "denomination" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "booking_denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."booking_payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "bank_name" TEXT,
    "favour_of" TEXT,
    "cheque_number" TEXT,
    "cheque_date" TIMESTAMP(3),
    "gpay_reference" TEXT,
    "cash_amount" DOUBLE PRECISION,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "applicant_name" TEXT NOT NULL,
    "relation" TEXT,
    "applicant_address" TEXT,
    "pin_code" TEXT,
    "cell_number" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "wedding_day" TIMESTAMP(3),
    "project_name" TEXT NOT NULL,
    "plot_number" TEXT NOT NULL,
    "square_feet" DOUBLE PRECISION,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "ed_dd_sm_bm_name" TEXT,
    "reference_code" TEXT,
    "director_name" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'BOOKING_INITIATED',
    "signature_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch_type" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "status" "public"."BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "document_type" "public"."DocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."members" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "blood_group" TEXT,
    "qualification" TEXT,
    "experience" TEXT,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "pan_number" TEXT,
    "aadhaar_number" TEXT,
    "voter_id_number" TEXT,
    "driving_license" TEXT,
    "role" "public"."Role" NOT NULL,
    "intro_name" TEXT,
    "reports_to_id" TEXT,
    "code_number" TEXT,
    "nominee_name" TEXT,
    "nominee_relation" TEXT,
    "nominee_phone" TEXT,
    "bank_name" TEXT,
    "account_holder" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "bank_branch" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_role" TEXT NOT NULL,
    "branch_id" TEXT,
    "message_type" "public"."MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_module" TEXT,
    "related_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_recipients" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "related_module" TEXT,
    "related_entity_id" TEXT,
    "triggered_by_id" TEXT,
    "branch_id" TEXT,
    "property_id" TEXT,
    "booking_id" TEXT,
    "billing_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."properties" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "property_name" TEXT NOT NULL,
    "property_code" TEXT,
    "project_name" TEXT NOT NULL,
    "plot_number" TEXT NOT NULL,
    "property_type" "public"."PropertyType" NOT NULL,
    "square_feet" DOUBLE PRECISION,
    "facing" TEXT,
    "approval_status" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "map_location" TEXT,
    "workflow_status" "public"."WorkflowStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."top_performers" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "rank" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,
    "tagged_count" INTEGER NOT NULL DEFAULT 0,
    "properties_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "top_performers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_history" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "remarks" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_admin_id_key" ON "public"."admins"("admin_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "public"."admins"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_billing_id_key" ON "public"."billing"("billing_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_id_key" ON "public"."bookings"("booking_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "public"."branches"("branch_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "members_aadhaar_number_key" ON "public"."members"("aadhaar_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "members_member_id_key" ON "public"."members"("member_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "members_pan_number_key" ON "public"."members"("pan_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "public"."members"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_key" ON "public"."notification_recipients"("notification_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "properties_property_code_key" ON "public"."properties"("property_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "properties_property_id_key" ON "public"."properties"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "public"."sessions"("refresh_token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone" ASC);

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing" ADD CONSTRAINT "billing_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_denominations" ADD CONSTRAINT "booking_denominations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "doc_admin_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "doc_billing_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "doc_booking_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "doc_member_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "doc_property_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_messages" ADD CONSTRAINT "notification_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."billing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."top_performers" ADD CONSTRAINT "top_performers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_history" ADD CONSTRAINT "wh_billing_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_history" ADD CONSTRAINT "wh_booking_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_history" ADD CONSTRAINT "wh_property_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

