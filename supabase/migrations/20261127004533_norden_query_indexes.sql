CREATE INDEX IF NOT EXISTS bookings_cancelled_starts
  ON norden.bookings (starts) WHERE status = 'CANCELADO';

CREATE INDEX IF NOT EXISTS flow_vacancy_booking
  ON norden.flow (vacancy_id, booking_id);

CREATE INDEX IF NOT EXISTS orders_created_desc
  ON norden.orders (created DESC);

CREATE INDEX IF NOT EXISTS movements_recent
  ON norden.movements (at DESC, rowid DESC);

CREATE INDEX IF NOT EXISTS audits_recent
  ON norden.audits (at DESC, rowid DESC);
