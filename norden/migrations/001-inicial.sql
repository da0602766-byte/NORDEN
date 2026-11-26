CREATE TABLE accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('cliente','profissional','gestor')),
  name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', birth TEXT NOT NULL DEFAULT '',
  preference TEXT NOT NULL DEFAULT '', move_ok INTEGER NOT NULL DEFAULT 1,
  photo_ok INTEGER NOT NULL DEFAULT 0, verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL
);
CREATE TABLE safety (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id), payload TEXT NOT NULL,
  version TEXT NOT NULL, consent_at INTEGER NOT NULL
);
CREATE TABLE consent_events (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL, version TEXT NOT NULL, accepted INTEGER NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE sessions (
  digest TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), expiry INTEGER NOT NULL
);
CREATE TABLE tokens (
  digest TEXT PRIMARY KEY, purpose TEXT NOT NULL, target TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
  expiry INTEGER NOT NULL, used INTEGER
);
CREATE TABLE professionals (
  id TEXT PRIMARY KEY, account_id TEXT UNIQUE REFERENCES accounts(id), name TEXT NOT NULL, specialty TEXT NOT NULL,
  description TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE services (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL CHECK(price>=0),
  duration INTEGER NOT NULL CHECK(duration BETWEEN 15 AND 480),
  padding INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE professional_services (
  professional_id TEXT NOT NULL REFERENCES professionals(id), service_id TEXT NOT NULL REFERENCES services(id),
  PRIMARY KEY(professional_id,service_id)
);
CREATE TABLE hours (
  professional_id TEXT NOT NULL REFERENCES professionals(id), day INTEGER NOT NULL CHECK(day BETWEEN 0 AND 6),
  starts TEXT NOT NULL, ends TEXT NOT NULL, PRIMARY KEY(professional_id,day,starts)
);
CREATE TABLE blocks (
  id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), starts INTEGER NOT NULL,
  ends INTEGER NOT NULL CHECK(ends>starts), reason TEXT NOT NULL
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL,
  brand TEXT NOT NULL, description TEXT NOT NULL, ingredients TEXT NOT NULL DEFAULT '', usage TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '', size TEXT NOT NULL DEFAULT '', image TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK(price>=0), promo INTEGER CHECK(promo>=0 AND promo<=price),
  physical INTEGER NOT NULL DEFAULT 0, reserved INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 3, active INTEGER NOT NULL DEFAULT 1,
  CHECK(physical>=reserved AND reserved>=0)
);
CREATE TABLE service_products (
  service_id TEXT NOT NULL REFERENCES services(id), product_id TEXT NOT NULL REFERENCES products(id),
  PRIMARY KEY(service_id,product_id)
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), professional_id TEXT NOT NULL REFERENCES professionals(id),
  service_id TEXT NOT NULL REFERENCES services(id), service_name TEXT NOT NULL, professional_name TEXT NOT NULL,
  starts INTEGER NOT NULL, ends INTEGER NOT NULL, duration INTEGER NOT NULL, padding INTEGER NOT NULL, price INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('CONFIRMADO','CANCELADO','EM_ATENDIMENTO','CONCLUIDO','NAO_COMPARECEU')),
  preferences TEXT NOT NULL DEFAULT '[]', created INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '',
  started INTEGER, finished INTEGER
);
CREATE INDEX booking_time ON bookings(professional_id,starts,ends);
CREATE INDEX booking_client ON bookings(client_id,starts);
CREATE TRIGGER booking_insert_guard BEFORE INSERT ON bookings WHEN NEW.status IN ('CONFIRMADO','EM_ATENDIMENTO')
BEGIN
  SELECT RAISE(ABORT,'Agenda indisponível') WHERE EXISTS (
    SELECT 1 FROM bookings b WHERE b.status IN ('CONFIRMADO','EM_ATENDIMENTO')
    AND (b.professional_id=NEW.professional_id OR b.client_id=NEW.client_id)
    AND b.starts<NEW.ends AND b.ends>NEW.starts
  );
END;
CREATE TRIGGER booking_update_guard BEFORE UPDATE OF starts,ends,professional_id,client_id,status ON bookings
WHEN NEW.status IN ('CONFIRMADO','EM_ATENDIMENTO')
BEGIN
  SELECT RAISE(ABORT,'Agenda indisponível') WHERE EXISTS (
    SELECT 1 FROM bookings b WHERE b.id<>NEW.id AND b.status IN ('CONFIRMADO','EM_ATENDIMENTO')
    AND (b.professional_id=NEW.professional_id OR b.client_id=NEW.client_id)
    AND b.starts<NEW.ends AND b.ends>NEW.starts
  );
END;
CREATE TABLE booking_events (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), actor TEXT REFERENCES accounts(id),
  type TEXT NOT NULL, at INTEGER NOT NULL, info TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE flow (
  id TEXT PRIMARY KEY, vacancy_id TEXT NOT NULL REFERENCES bookings(id), booking_id TEXT NOT NULL REFERENCES bookings(id),
  original INTEGER NOT NULL, proposed INTEGER NOT NULL, expiry INTEGER NOT NULL, approved_by TEXT NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK(status IN ('OFERTADA','EFETIVADA','RECUSADA','EXPIRADA','INVALIDADA')),
  created INTEGER NOT NULL, UNIQUE(vacancy_id,booking_id)
);
CREATE TABLE templates (
  id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id), title TEXT NOT NULL,
  version INTEGER NOT NULL, sections TEXT NOT NULL, active INTEGER NOT NULL, updated INTEGER NOT NULL,
  UNIQUE(service_id,version)
);
CREATE TABLE appointments (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id), procedure TEXT NOT NULL, used TEXT NOT NULL, recommended TEXT NOT NULL,
  summary TEXT NOT NULL, private_note TEXT NOT NULL, return_on TEXT NOT NULL,
  manual TEXT NOT NULL, author TEXT NOT NULL REFERENCES accounts(id), updated INTEGER NOT NULL
);
CREATE TABLE appointment_revisions (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES appointments(booking_id), prior TEXT NOT NULL,
  actor TEXT NOT NULL REFERENCES accounts(id), at INTEGER NOT NULL
);
CREATE TABLE appointment_media (
  id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES appointments(booking_id), kind TEXT NOT NULL,
  mime TEXT NOT NULL, content BLOB NOT NULL
);
CREATE TABLE addresses (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), label TEXT NOT NULL, values_json TEXT NOT NULL
);
CREATE TABLE cart_items (
  client_id TEXT NOT NULL REFERENCES accounts(id), product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(client_id,product_id)
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), request_key TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('retirada','entrega')),
  status TEXT NOT NULL, financial TEXT NOT NULL CHECK(financial IN ('SIMULADO','NAO_PAGO')),
  subtotal INTEGER NOT NULL, fee INTEGER NOT NULL, total INTEGER NOT NULL,
  destination TEXT NOT NULL, quote TEXT NOT NULL, created INTEGER NOT NULL, UNIQUE(client_id,request_key)
);
CREATE TABLE order_items (
  order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL, price INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY(order_id,product_id)
);
CREATE TABLE order_events (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), actor TEXT REFERENCES accounts(id),
  status TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE movements (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), kind TEXT NOT NULL, quantity INTEGER NOT NULL,
  ref TEXT, actor TEXT REFERENCES accounts(id), reason TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), title TEXT NOT NULL, href TEXT NOT NULL,
  created INTEGER NOT NULL, read_at INTEGER, dedupe TEXT NOT NULL, UNIQUE(account_id,dedupe)
);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
CREATE TABLE audits (
  id TEXT PRIMARY KEY, actor TEXT REFERENCES accounts(id), action TEXT NOT NULL,
  entity TEXT NOT NULL, target TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE privacy_requests (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL,
  message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'ABERTA', created INTEGER NOT NULL
);
CREATE TABLE gallery (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, image TEXT NOT NULL, authorized INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE reviews (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL, publish_ok INTEGER NOT NULL, moderation TEXT NOT NULL, updated INTEGER NOT NULL
);
