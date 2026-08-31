-- Double-booking prevention (spec sections 36-38, 95).
--
-- The application already checks table availability before proposing a
-- slot, but two requests racing for the same table/slot could both pass
-- that check before either commits. A Postgres EXCLUDE constraint closes
-- that race at the database level: it is enforced atomically by the same
-- machinery as a unique index, so no application-level locking or
-- serializable-transaction retry loop is required.
--
-- The generated `duration` column materializes [startAt, endAt) as a
-- tsrange so GiST can index it. `startAt`/`endAt` are stored as
-- TIMESTAMP(3) WITHOUT TIME ZONE (always holding a UTC instant by
-- application convention, see lib/datetime.ts) — tsrange is used rather
-- than tstzrange because casting to timestamptz inside a generated column
-- is rejected by Postgres as not immutable (it would depend on the
-- session's TimeZone setting).
--
-- The exclusion only applies to CONFIRMED reservations that have an
-- assigned table — a cancelled reservation, or one not yet assigned a
-- table, never blocks a new booking.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservation"
  ADD COLUMN "duration" tsrange
  GENERATED ALWAYS AS (tsrange("startAt", "endAt", '[)')) STORED;

ALTER TABLE "reservation"
  ADD CONSTRAINT "reservation_no_overlap"
  EXCLUDE USING gist (
    "tableId" WITH =,
    "duration" WITH &&
  )
  WHERE ("tableId" IS NOT NULL AND "status" = 'CONFIRMED');
