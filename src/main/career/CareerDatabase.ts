// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Career Database Manager
// ═══════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type {
  Airport, Mission, Aircraft, Pilot, FlightRecord,
  Transaction, MissionStatus, TransactionCategory,
} from '../../shared/types';
import { STARTING_BALANCE } from '../../shared/constants';
import aircraftTypes from './schema/seed/aircraft_types.json';

/** Mirrors the aircraft_types table schema. */
export interface AircraftType {
  type_id: number;
  name: string;
  manufacturer: string;
  category: 'SEP' | 'MEP' | 'SET' | 'MET' | 'JET' | 'HELI';
  cruise_speed_ktas: number;
  max_range_nm: number;
  fuel_type: 'JetA' | 'AvGas';
  fuel_capacity_gal: number;
  fuel_burn_gph: number;
  empty_weight_lbs: number;
  max_payload_lbs: number;
  mtow_lbs: number;
  max_pax: number;
  purchase_price: number;
  lease_monthly: number;
  sim_title: string | null;
}

const MIGRATIONS = [
  // 001_airports.sql
  `CREATE TABLE IF NOT EXISTS airports (
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

  CREATE INDEX IF NOT EXISTS idx_airports_lat ON airports(lat);
  CREATE INDEX IF NOT EXISTS idx_airports_lon ON airports(lon);
  CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
  CREATE INDEX IF NOT EXISTS idx_airports_type ON airports(type);
  CREATE INDEX IF NOT EXISTS idx_runways_airport ON runways(airport_icao);`,

  // 002_aircraft.sql
  `CREATE TABLE IF NOT EXISTS aircraft_types (
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
  CREATE INDEX IF NOT EXISTS idx_aircraft_status   ON aircraft(status);`,

  // 003_pilot_company.sql
  `CREATE TABLE IF NOT EXISTS pilot (
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
  );`,

  // 004_missions_flights.sql
  `CREATE TABLE IF NOT EXISTS missions (
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
  CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_time);`,

  // 005_finances.sql
  `CREATE TABLE IF NOT EXISTS transactions (
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
  CREATE INDEX IF NOT EXISTS idx_txn_flight    ON transactions(flight_id);`,

  // 006_bases_crew.sql
  `CREATE TABLE IF NOT EXISTS bases (
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
  CREATE INDEX IF NOT EXISTS idx_crew_status   ON crew(status);`
];

export default class CareerDatabase {
  private _db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this._db = new Database(dbPath);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
  }

  /** Internal accessor for raw queries from sibling modules. */
  get db(): Database.Database {
    return this._db;
  }

  // ── Migrations ─────────────────────────────────────

  runMigrations(): void {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const applied = new Set(
      this._db.prepare('SELECT name FROM _migrations').all()
        .map((r: any) => r.name as string),
    );

    for (let i = 0; i < MIGRATIONS.length; i++) {
      const name = `migration_${i + 1}`;
      if (applied.has(name)) continue;
      this._db.exec(MIGRATIONS[i]);
      this._db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
    }
  }

  // ── Seed Data ──────────────────────────────────────

  seedData(): void {
    const count = (this._db.prepare('SELECT COUNT(*) AS c FROM aircraft_types').get() as any)?.c ?? 0;
    if (count > 0) return;

    const insert = this._db.prepare(`
      INSERT INTO aircraft_types
        (name, manufacturer, category, cruise_speed_ktas, max_range_nm,
         fuel_type, fuel_capacity_gal, fuel_burn_gph, empty_weight_lbs,
         max_payload_lbs, mtow_lbs, max_pax, purchase_price, lease_monthly, sim_title)
      VALUES
        (@name, @manufacturer, @category, @cruise_speed_ktas, @max_range_nm,
         @fuel_type, @fuel_capacity_gal, @fuel_burn_gph, @empty_weight_lbs,
         @max_payload_lbs, @mtow_lbs, @max_pax, @purchase_price, @lease_monthly, @sim_title)
    `);

    const batch = this._db.transaction((rows: any[]) => {
      for (const row of rows) insert.run(row);
    });
    batch(aircraftTypes);
  }

  // ── Airport Import ─────────────────────────────────

  /**
   * Bulk-import airports from an OurAirports-format CSV string or file path.
   * Expects header: id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,
   *   continent,iso_country,iso_region,municipality,...
   */
  importAirports(csvPath: string): number {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split('\n');
    if (lines.length < 2) return 0;

    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const idx = (col: string) => header.indexOf(col);

    const insert = this._db.prepare(`
      INSERT OR IGNORE INTO airports
        (icao, name, lat, lon, elevation_ft, type, country, region, municipality, has_jeta, has_avgas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const batch = this._db.transaction((rows: string[]) => {
      for (const line of rows) {
        if (!line.trim()) continue;
        const cols = parseCsvLine(line);
        const ident = cols[idx('ident')]?.replace(/"/g, '');
        const type = cols[idx('type')]?.replace(/"/g, '');
        if (!ident || type === 'closed') continue;

        const lat = parseFloat(cols[idx('latitude_deg')] ?? '');
        const lon = parseFloat(cols[idx('longitude_deg')] ?? '');
        if (isNaN(lat) || isNaN(lon)) continue;

        const hasJeta = type === 'large_airport' || type === 'medium_airport' ? 1 : 0;
        const hasAvgas = type !== 'large_airport' ? 1 : 0;

        insert.run(
          ident,
          cols[idx('name')]?.replace(/"/g, '') ?? ident,
          lat, lon,
          parseInt(cols[idx('elevation_ft')] ?? '0', 10) || 0,
          type,
          cols[idx('iso_country')]?.replace(/"/g, '') ?? '',
          cols[idx('iso_region')]?.replace(/"/g, '') ?? '',
          cols[idx('municipality')]?.replace(/"/g, '') ?? '',
          hasJeta, hasAvgas,
        );
        imported++;
      }
    });
    batch(lines.slice(1));
    return imported;
  }

  // ── Query Helpers ──────────────────────────────────

  getAirport(icao: string): Airport | undefined {
    return this._db.prepare('SELECT * FROM airports WHERE icao = ?').get(icao) as Airport | undefined;
  }

  getAircraftTypes(): AircraftType[] {
    return this._db.prepare('SELECT * FROM aircraft_types ORDER BY category, name').all() as AircraftType[];
  }

  getAircraftType(typeId: number): AircraftType | undefined {
    return this._db.prepare('SELECT * FROM aircraft_types WHERE type_id = ?').get(typeId) as AircraftType | undefined;
  }

  getPilot(): Pilot | undefined {
    return this._db.prepare('SELECT * FROM pilot LIMIT 1').get() as Pilot | undefined;
  }

  createPilot(name: string, homeBase: string): Pilot {
    const info = this._db.prepare(`
      INSERT INTO pilot (name, balance, home_base, current_location)
      VALUES (?, ?, ?, ?)
    `).run(name, STARTING_BALANCE, homeBase, homeBase);

    return this._db.prepare('SELECT * FROM pilot WHERE pilot_id = ?')
      .get(info.lastInsertRowid) as Pilot;
  }

  updatePilotLocation(icao: string): void {
    this._db.prepare('UPDATE pilot SET current_location = ?').run(icao);
  }

  getFleet(): Aircraft[] {
    return this._db.prepare('SELECT * FROM aircraft ORDER BY aircraft_id').all() as Aircraft[];
  }

  getAircraftAt(icao: string): Aircraft[] {
    return this._db.prepare('SELECT * FROM aircraft WHERE location_icao = ?').all(icao) as Aircraft[];
  }

  getMissions(status?: MissionStatus): Mission[] {
    if (status) {
      return this._db.prepare('SELECT * FROM missions WHERE status = ? ORDER BY generated_at DESC')
        .all(status) as Mission[];
    }
    return this._db.prepare('SELECT * FROM missions ORDER BY generated_at DESC').all() as Mission[];
  }

  getMission(missionId: number): Mission | undefined {
    return this._db.prepare('SELECT * FROM missions WHERE mission_id = ?').get(missionId) as Mission | undefined;
  }

  getFlights(limit = 50): FlightRecord[] {
    return this._db.prepare('SELECT * FROM flights ORDER BY departure_time DESC LIMIT ?')
      .all(limit) as FlightRecord[];
  }

  getTransactions(limit = 50): Transaction[] {
    return this._db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Transaction[];
  }

  // ── Transaction Control ────────────────────────────

  beginTransaction(): void {
    this._db.exec('BEGIN');
  }

  commit(): void {
    this._db.exec('COMMIT');
  }

  rollback(): void {
    this._db.exec('ROLLBACK');
  }

  close(): void {
    this._db.close();
  }
}

// ── CSV Helpers ────────────────────────────────────────

/** Naive CSV line parser that handles quoted fields. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
