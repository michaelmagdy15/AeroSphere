-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 001: Airports & Runways
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS airports (
  icao        TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  lat         REAL    NOT NULL,
  lon         REAL    NOT NULL,
  elevation_ft INTEGER DEFAULT 0,
  type        TEXT    NOT NULL DEFAULT 'small_airport',
  country     TEXT,
  region      TEXT,
  municipality TEXT,
  has_jeta    INTEGER NOT NULL DEFAULT 0,
  has_avgas   INTEGER NOT NULL DEFAULT 0,
  jeta_price  REAL,
  avgas_price REAL,
  timezone    TEXT
);

CREATE TABLE IF NOT EXISTS runways (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  airport_icao TEXT    NOT NULL,
  length_ft    INTEGER NOT NULL DEFAULT 0,
  width_ft     INTEGER NOT NULL DEFAULT 0,
  surface      TEXT,
  lighted      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (airport_icao) REFERENCES airports(icao) ON DELETE CASCADE
);

-- Spatial bounding-box queries on lat/lon
CREATE INDEX IF NOT EXISTS idx_airports_lat ON airports(lat);
CREATE INDEX IF NOT EXISTS idx_airports_lon ON airports(lon);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
CREATE INDEX IF NOT EXISTS idx_airports_type ON airports(type);
CREATE INDEX IF NOT EXISTS idx_runways_airport ON runways(airport_icao);
