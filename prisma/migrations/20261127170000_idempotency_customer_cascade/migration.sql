-- Preserve the original migration; fail safely if existing orphaned snapshots need review.
ALTER TABLE "reservation_create_requests"
  ADD CONSTRAINT "reservation_create_requests_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
