-- ═══════════════════════════════════════════════════════
-- AeroSphere Studio — 002: Aircraft Types & Fleet
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS aircraft_types (
  type_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  manufacturer   TEXT,
  category       TEXT    NOT NULL CHECK(category IN ('SEP','MEP','SET','MET','JET','HELI')),
  cruise_speed_ktas INTEGER NOT NULL,
  max_range_nm   INTEGER NOT NULL,
  fuel_type      TEXT    NOT NULL CHECK(fuel_type IN ('JetA','AvGas')),
  fuel_capacity_gal REAL NOT NULL,
  fuel_burn_gph  REAL    NOT NULL,
  empty_weight_lbs  INTEGER NOT NULL,
  max_payload_lbs   INTEGER NOT NULL,
  mtow_lbs       INTEGER NOT NULL,
  max_pax        INTEGER NOT NULL DEFAULT 0,
  purchase_price INTEGER NOT NULL,
  lease_monthly  INTEGER NOT NULL,
  sim_title      TEXT
);

CREATE TABLE IF NOT EXISTS aircraft (
  aircraft_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id        INTEGER NOT NULL,
  registration   TEXT    NOT NULL UNIQUE,
  location_icao  TEXT    NOT NULL,
  condition_pct  REAL    NOT NULL DEFAULT 100.0,
  total_hours    REAL    NOT NULL DEFAULT 0.0,
  hours_since_mx REAL    NOT NULL DEFAULT 0.0,
  fuel_onboard_gal REAL  NOT NULL DEFAULT 0.0,
  status         TEXT    NOT NULL DEFAULT 'available'
                 CHECK(status IN ('available','in_flight','maintenance','grounded')),
  FOREIGN KEY (type_id)       REFERENCES aircraft_types(type_id),
  FOREIGN KEY (location_icao) REFERENCES airports(icao)
);

CREATE INDEX IF NOT EXISTS idx_aircraft_location ON aircraft(location_icao);
CREATE INDEX IF NOT EXISTS idx_aircraft_type     ON aircraft(type_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_status   ON aircraft(status);
