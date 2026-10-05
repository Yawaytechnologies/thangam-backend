CREATE TABLE "customer_referrals" (
 "id" TEXT NOT NULL, "requestKey" TEXT NOT NULL, "branchId" TEXT NOT NULL, "createdById" TEXT NOT NULL,
 "assignedAgentId" TEXT NOT NULL, "currentReviewerId" TEXT, "propertyId" TEXT NOT NULL,
 "customerName" TEXT NOT NULL, "customerPhone" TEXT NOT NULL, "notes" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'ASSIGNED', "nextActionAt" TIMESTAMP(3),
 "version" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "customer_referrals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_referrals_branchId_assignedAgentId_idx" ON "customer_referrals"("branchId", "assignedAgentId");
CREATE INDEX "customer_referrals_currentReviewerId_idx" ON "customer_referrals"("currentReviewerId");
CREATE TABLE "customer_referral_activities" (
 "id" TEXT NOT NULL, "referralId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL,
 "action" TEXT NOT NULL, "notes" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "customer_referral_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_referral_activities_referralId_createdAt_idx" ON "customer_referral_activities"("referralId", "createdAt");

CREATE UNIQUE INDEX "customer_referrals_requestKey_key" ON "customer_referrals"("requestKey");
