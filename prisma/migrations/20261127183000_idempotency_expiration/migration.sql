-- The prior Prisma timestamp is stored in UTC without a time zone.
ALTER TABLE "reservation_create_requests" ADD COLUMN "expiresAt" TIMESTAMPTZ(3);
ALTER TABLE "reservation_create_requests" ADD COLUMN "responseEncrypted" BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE "reservation_create_requests"
SET "expiresAt" = ("createdAt" AT TIME ZONE 'UTC') + INTERVAL '24 hours';
ALTER TABLE "reservation_create_requests" ALTER COLUMN "expiresAt" SET NOT NULL;
CREATE INDEX "reservation_create_requests_expiresAt_idx" ON "reservation_create_requests"("expiresAt");
