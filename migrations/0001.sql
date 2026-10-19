CREATE TABLE IF NOT EXISTS bookmark_document (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL CHECK (version >= 1),
  body TEXT NOT NULL CHECK (json_valid(body)),
  updated_at TEXT NOT NULL
);
