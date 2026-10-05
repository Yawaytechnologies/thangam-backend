WITH approved AS MATERIALIZED (
  SELECT referral."id", referral."branchId", referral."currentReviewerId" AS "directorId"
  FROM "customer_referrals" AS referral
  WHERE referral."status" = 'DIRECTOR_APPROVED'
), handoffs AS (
  UPDATE "customer_referrals" AS referral
  SET "status" = 'WITH_ADMIN',
      "currentReviewerId" = (
        SELECT admin."id"
        FROM "admins" AS admin
        INNER JOIN "users" AS account ON account."id" = admin."user_id"
        WHERE admin."branch_id" = referral."branchId"
          AND admin."status" = 'ACTIVE'
          AND account."status" = 'ACTIVE'
          AND account."role" = 'ADMIN'
        ORDER BY admin."created_at" ASC
        LIMIT 1
      ),
      "version" = referral."version" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
  FROM approved
  WHERE referral."id" = approved."id"
    AND EXISTS (
      SELECT 1
      FROM "admins" AS admin
      INNER JOIN "users" AS account ON account."id" = admin."user_id"
      WHERE admin."branch_id" = referral."branchId"
        AND admin."status" = 'ACTIVE'
        AND account."status" = 'ACTIVE'
        AND account."role" = 'ADMIN'
    )
  RETURNING referral."id"
)
INSERT INTO "customer_referral_activities" ("id", "referralId", "actorId", "actorName", "action", "notes", "createdAt")
SELECT gen_random_uuid()::text, handoffs."id", approved."directorId", COALESCE(director."full_name", 'Director'), 'SENT_TO_ADMIN',
       'Automatically handed off previously Director-approved referral to branch Admin during Stage 5 migration',
       CURRENT_TIMESTAMP
FROM handoffs
INNER JOIN approved ON approved."id" = handoffs."id"
LEFT JOIN "members" AS director ON director."id" = approved."directorId";
