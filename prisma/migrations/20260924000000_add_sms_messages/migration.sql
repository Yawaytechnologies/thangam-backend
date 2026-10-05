CREATE TABLE "sms_messages" (
  "id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "provider_id" TEXT,
  "error_code" TEXT,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sms_messages_event_key_key" ON "sms_messages"("event_key");
CREATE INDEX "sms_messages_status_next_attempt_at_idx" ON "sms_messages"("status", "next_attempt_at");
