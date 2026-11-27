-- Additive table: no existing reservation rows are modified.
CREATE TABLE "reservation_create_requests" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_create_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reservation_create_requests_customerId_keyHash_key"
  ON "reservation_create_requests"("customerId", "keyHash");
