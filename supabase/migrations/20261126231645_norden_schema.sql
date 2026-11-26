-- Banco privado do NORDEN. O navegador acessa somente a API Vercel.
CREATE SCHEMA IF NOT EXISTS norden;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET search_path TO norden, extensions, public, pg_catalog;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('cliente','profissional','gestor')),
  name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', birth TEXT NOT NULL DEFAULT '',
  preference TEXT NOT NULL DEFAULT '', move_ok BIGINT NOT NULL DEFAULT 1,
  photo_ok BIGINT NOT NULL DEFAULT 0, verified BIGINT NOT NULL DEFAULT 0,
  active BIGINT NOT NULL DEFAULT 1, created BIGINT NOT NULL
);
CREATE TABLE safety (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id), payload TEXT NOT NULL,
  version TEXT NOT NULL, consent_at BIGINT NOT NULL
);
CREATE TABLE consent_events (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL, version TEXT NOT NULL, accepted BIGINT NOT NULL, at BIGINT NOT NULL
);
CREATE TABLE sessions (
  digest TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), expiry BIGINT NOT NULL
);
CREATE TABLE tokens (
  digest TEXT PRIMARY KEY, purpose TEXT NOT NULL, target TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
  expiry BIGINT NOT NULL, used BIGINT
);
CREATE TABLE professionals (
  id TEXT PRIMARY KEY, account_id TEXT UNIQUE REFERENCES accounts(id), name TEXT NOT NULL, specialty TEXT NOT NULL,
  description TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', active BIGINT NOT NULL DEFAULT 1
);
CREATE TABLE services (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '', price BIGINT NOT NULL CHECK(price>=0),
  duration BIGINT NOT NULL CHECK(duration BETWEEN 15 AND 480),
  padding BIGINT NOT NULL DEFAULT 0, active BIGINT NOT NULL DEFAULT 1
);
CREATE TABLE professional_services (
  professional_id TEXT NOT NULL REFERENCES professionals(id), service_id TEXT NOT NULL REFERENCES services(id),
  PRIMARY KEY(professional_id,service_id)
);
CREATE TABLE hours (
  professional_id TEXT NOT NULL REFERENCES professionals(id), day BIGINT NOT NULL CHECK(day BETWEEN 0 AND 6),
  starts TEXT NOT NULL, ends TEXT NOT NULL, PRIMARY KEY(professional_id,day,starts)
);
CREATE TABLE blocks (
  id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), starts BIGINT NOT NULL,
  ends BIGINT NOT NULL CHECK(ends>starts), reason TEXT NOT NULL
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL,
  brand TEXT NOT NULL, description TEXT NOT NULL, ingredients TEXT NOT NULL DEFAULT '', usage TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '', size TEXT NOT NULL DEFAULT '', image TEXT NOT NULL DEFAULT '',
  price BIGINT NOT NULL CHECK(price>=0), promo BIGINT CHECK(promo>=0 AND promo<=price),
  physical BIGINT NOT NULL DEFAULT 0, reserved BIGINT NOT NULL DEFAULT 0,
  threshold BIGINT NOT NULL DEFAULT 3, active BIGINT NOT NULL DEFAULT 1,
  CHECK(physical>=reserved AND reserved>=0)
);
CREATE TABLE service_products (
  service_id TEXT NOT NULL REFERENCES services(id), product_id TEXT NOT NULL REFERENCES products(id),
  PRIMARY KEY(service_id,product_id)
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), professional_id TEXT NOT NULL REFERENCES professionals(id),
  service_id TEXT NOT NULL REFERENCES services(id), service_name TEXT NOT NULL, professional_name TEXT NOT NULL,
  starts BIGINT NOT NULL, ends BIGINT NOT NULL, duration BIGINT NOT NULL, padding BIGINT NOT NULL, price BIGINT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('CONFIRMADO','CANCELADO','EM_ATENDIMENTO','CONCLUIDO','NAO_COMPARECEU')),
  preferences TEXT NOT NULL DEFAULT '[]', created BIGINT NOT NULL, reason TEXT NOT NULL DEFAULT '',
  started BIGINT, finished BIGINT
);
CREATE INDEX booking_time ON bookings(professional_id,starts,ends);
CREATE INDEX booking_client ON bookings(client_id,starts);
CREATE TABLE booking_events (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), actor TEXT REFERENCES accounts(id),
  type TEXT NOT NULL, at BIGINT NOT NULL, info TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE flow (
  id TEXT PRIMARY KEY, vacancy_id TEXT NOT NULL REFERENCES bookings(id), booking_id TEXT NOT NULL REFERENCES bookings(id),
  original BIGINT NOT NULL, proposed BIGINT NOT NULL, expiry BIGINT NOT NULL, approved_by TEXT NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK(status IN ('OFERTADA','EFETIVADA','RECUSADA','EXPIRADA','INVALIDADA')),
  created BIGINT NOT NULL, UNIQUE(vacancy_id,booking_id)
);
CREATE TABLE templates (
  id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id), title TEXT NOT NULL,
  version BIGINT NOT NULL, sections TEXT NOT NULL, active BIGINT NOT NULL, updated BIGINT NOT NULL,
  UNIQUE(service_id,version)
);
CREATE TABLE appointments (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id), procedure TEXT NOT NULL, used TEXT NOT NULL, recommended TEXT NOT NULL,
  summary TEXT NOT NULL, private_note TEXT NOT NULL, return_on TEXT NOT NULL,
  manual TEXT NOT NULL, author TEXT NOT NULL REFERENCES accounts(id), updated BIGINT NOT NULL
);
CREATE TABLE appointment_revisions (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES appointments(booking_id), prior TEXT NOT NULL,
  actor TEXT NOT NULL REFERENCES accounts(id), at BIGINT NOT NULL
);
CREATE TABLE appointment_media (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES appointments(booking_id), kind TEXT NOT NULL,
  mime TEXT NOT NULL, content BYTEA NOT NULL
);
CREATE TABLE addresses (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), label TEXT NOT NULL, values_json TEXT NOT NULL
);
CREATE TABLE cart_items (
  client_id TEXT NOT NULL REFERENCES accounts(id), product_id TEXT NOT NULL REFERENCES products(id),
  quantity BIGINT NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(client_id,product_id)
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), request_key TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('retirada','entrega')),
  status TEXT NOT NULL, financial TEXT NOT NULL CHECK(financial IN ('SIMULADO','NAO_PAGO')),
  subtotal BIGINT NOT NULL, fee BIGINT NOT NULL, total BIGINT NOT NULL,
  destination TEXT NOT NULL, quote TEXT NOT NULL, created BIGINT NOT NULL, UNIQUE(client_id,request_key)
);
CREATE TABLE order_items (
  order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL, price BIGINT NOT NULL, quantity BIGINT NOT NULL, PRIMARY KEY(order_id,product_id)
);
CREATE TABLE order_events (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), actor TEXT REFERENCES accounts(id),
  status TEXT NOT NULL, reason TEXT NOT NULL, at BIGINT NOT NULL
);
CREATE TABLE movements (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), kind TEXT NOT NULL, quantity BIGINT NOT NULL,
  ref TEXT, actor TEXT REFERENCES accounts(id), reason TEXT NOT NULL, at BIGINT NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), title TEXT NOT NULL, href TEXT NOT NULL,
  created BIGINT NOT NULL, read_at BIGINT, dedupe TEXT NOT NULL, UNIQUE(account_id,dedupe)
);
CREATE TABLE settings (id BIGINT PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
CREATE TABLE audits (
  id TEXT PRIMARY KEY, actor TEXT REFERENCES accounts(id), action TEXT NOT NULL,
  entity TEXT NOT NULL, target TEXT NOT NULL, at BIGINT NOT NULL
);
CREATE TABLE privacy_requests (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL,
  message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'ABERTA', created BIGINT NOT NULL
);
CREATE TABLE gallery (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, image TEXT NOT NULL, authorized BIGINT NOT NULL,
  active BIGINT NOT NULL DEFAULT 1
);
CREATE TABLE reviews (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id), rating BIGINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL, publish_ok BIGINT NOT NULL, moderation TEXT NOT NULL, updated BIGINT NOT NULL
);

ALTER TABLE services ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE professionals ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE products ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE gallery ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE appointment_media ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE booking_events ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE addresses ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE cart_items ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE order_items ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE order_events ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE notifications ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE movements ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE templates ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE audits ADD COLUMN rowid BIGINT GENERATED ALWAYS AS IDENTITY;

ALTER TABLE bookings ADD CONSTRAINT booking_interval CHECK (ends > starts);
ALTER TABLE bookings ADD CONSTRAINT booking_professional_overlap EXCLUDE USING gist
  (professional_id WITH =, int8range(starts, ends, '[)') WITH &&)
  WHERE (status IN ('CONFIRMADO','EM_ATENDIMENTO'));
ALTER TABLE bookings ADD CONSTRAINT booking_client_overlap EXCLUDE USING gist
  (client_id WITH =, int8range(starts, ends, '[)') WITH &&)
  WHERE (status IN ('CONFIRMADO','EM_ATENDIMENTO'));

CREATE INDEX sessions_expiry ON sessions(expiry);
CREATE INDEX sessions_account ON sessions(account_id);
CREATE INDEX tokens_target_purpose ON tokens(target,purpose);
CREATE INDEX blocks_professional_time ON blocks(professional_id,starts,ends);
CREATE INDEX flow_booking ON flow(booking_id);
CREATE INDEX flow_active_expiry ON flow(expiry) WHERE status='OFERTADA';
CREATE INDEX orders_client_created ON orders(client_id,created DESC);
CREATE INDEX addresses_client ON addresses(client_id);
CREATE INDEX booking_events_history ON booking_events(booking_id,at,rowid);
CREATE INDEX order_events_history ON order_events(order_id,at,rowid);
CREATE INDEX private_media_booking ON appointment_media(booking_id);
CREATE INDEX notifications_account_created ON notifications(account_id,created DESC,rowid DESC);

CREATE TABLE auth_limits (
  key TEXT PRIMARY KEY,
  attempts INT NOT NULL CHECK(attempts>0),
  expires BIGINT NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'norden_app') THEN
    CREATE ROLE norden_app NOLOGIN;
  END IF;
END $$;
REVOKE ALL ON SCHEMA norden FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA norden FROM PUBLIC;
GRANT USAGE ON SCHEMA norden TO norden_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA norden TO norden_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA norden TO norden_app;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON accounts TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE safety ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON safety TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON consent_events TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON sessions TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON tokens TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON professionals TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON services TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON professional_services TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON hours TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON blocks TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON products TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE service_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON service_products TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON bookings TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON booking_events TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE flow ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON flow TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON templates TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON appointments TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE appointment_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON appointment_revisions TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE appointment_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON appointment_media TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON addresses TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON cart_items TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON orders TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON order_items TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON order_events TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON movements TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON notifications TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON settings TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON audits TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON privacy_requests TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON gallery TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON reviews TO norden_app USING (true) WITH CHECK (true);
ALTER TABLE auth_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_access ON auth_limits TO norden_app USING (true) WITH CHECK (true);
RESET search_path;
