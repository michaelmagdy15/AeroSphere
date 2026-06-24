-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 006: Bases & Crew
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bases (
  base_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  airport_icao     TEXT    NOT NULL UNIQUE,
  hangar_capacity  INTEGER NOT NULL DEFAULT 5,
  monthly_rent     REAL    NOT NULL,
  fuel_discount_pct REAL   NOT NULL DEFAULT 0.0,
  purchased_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (airport_icao) REFERENCES airports(icao)
);

CREATE TABLE IF NOT EXISTS crew (
  crew_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  skill_level      INTEGER NOT NULL DEFAULT 1
                   CHECK(skill_level BETWEEN 1 AND 5),
  specialty        TEXT,
  salary_per_flight REAL   NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'available'
                   CHECK(status IN ('available','on_mission','resting')),
  hired_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bases_airport ON bases(airport_icao);
CREATE INDEX IF NOT EXISTS idx_crew_status   ON crew(status);
