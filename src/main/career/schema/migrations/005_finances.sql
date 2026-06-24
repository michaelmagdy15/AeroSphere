-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 005: Financial Ledger
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
  txn_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  category     TEXT    NOT NULL,
  amount       REAL    NOT NULL,
  balance_after REAL   NOT NULL,
  description  TEXT,
  flight_id    INTEGER,
  timestamp    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);

CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_txn_category  ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_txn_flight    ON transactions(flight_id);
