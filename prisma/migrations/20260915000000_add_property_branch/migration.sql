ALTER TABLE "properties" ADD COLUMN "branch_id" TEXT;

CREATE INDEX "properties_branch_id_idx" ON "properties"("branch_id");

ALTER TABLE "properties"
ADD CONSTRAINT "properties_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
