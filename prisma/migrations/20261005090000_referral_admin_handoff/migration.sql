ALTER TABLE "customer_referrals" ADD COLUMN "bookingId" TEXT;
CREATE UNIQUE INDEX "customer_referrals_bookingId_key" ON "customer_referrals"("bookingId");
