-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 003: Pilot Profile
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pilot (
  pilot_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  balance          REAL    NOT NULL DEFAULT 25000.0,
  xp               INTEGER NOT NULL DEFAULT 0,
  reputation       INTEGER NOT NULL DEFAULT 50,
  license          TEXT    NOT NULL DEFAULT 'PPL'
                   CHECK(license IN ('SPL','PPL','CPL','ATPL')),
  home_base        TEXT,
  current_location TEXT,
  total_flights    INTEGER NOT NULL DEFAULT 0,
  total_hours      REAL    NOT NULL DEFAULT 0.0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (home_base)        REFERENCES airports(icao),
  FOREIGN KEY (current_location) REFERENCES airports(icao)
);
