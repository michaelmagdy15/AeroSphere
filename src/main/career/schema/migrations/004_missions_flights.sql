-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 004: Missions & Flight Log
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS missions (
  mission_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type               TEXT    NOT NULL
                     CHECK(type IN ('cargo','passenger','charter','medical','vip','tour')),
  origin_icao        TEXT    NOT NULL,
  dest_icao          TEXT    NOT NULL,
  distance_nm        REAL    NOT NULL,
  payload_lbs        INTEGER NOT NULL DEFAULT 0,
  pax_count          INTEGER NOT NULL DEFAULT 0,
  payout             REAL    NOT NULL,
  deadline           TEXT    NOT NULL,
  min_aircraft_category TEXT,
  description        TEXT,
  status             TEXT    NOT NULL DEFAULT 'available'
                     CHECK(status IN ('available','accepted','in_progress','completed','failed','expired')),
  generated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (origin_icao) REFERENCES airports(icao),
  FOREIGN KEY (dest_icao)   REFERENCES airports(icao)
);

CREATE TABLE IF NOT EXISTS flights (
  flight_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id      INTEGER,
  aircraft_id     INTEGER NOT NULL,
  departure_icao  TEXT    NOT NULL,
  arrival_icao    TEXT,
  departure_time  TEXT    NOT NULL,
  arrival_time    TEXT,
  flight_time_hrs REAL,
  fuel_used_gal   REAL,
  fuel_cost       REAL,
  landing_rate_fpm REAL,
  max_g           REAL,
  status          TEXT    NOT NULL DEFAULT 'completed'
                  CHECK(status IN ('completed','diverted','crashed','aborted')),
  notes           TEXT,
  FOREIGN KEY (mission_id)  REFERENCES missions(mission_id),
  FOREIGN KEY (aircraft_id) REFERENCES aircraft(aircraft_id)
);

CREATE INDEX IF NOT EXISTS idx_missions_status  ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_origin  ON missions(origin_icao);
CREATE INDEX IF NOT EXISTS idx_flights_mission  ON flights(mission_id);
CREATE INDEX IF NOT EXISTS idx_flights_aircraft ON flights(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_time);
