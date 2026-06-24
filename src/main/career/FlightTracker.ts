// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Real-Time Flight Tracker
// ═══════════════════════════════════════════════════════

import type { Telemetry, FlightRecord } from '../../shared/types';
import { HAVERSINE_EARTH_RADIUS_NM } from '../../shared/constants';
import type CareerDatabase from './CareerDatabase';

interface Breadcrumb {
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

/** Acceptable distance (NM) to consider "on airport". */
const AIRPORT_PROXIMITY_NM = 2.0;

export default class FlightTracker {
  private _tracking = false;
  private _missionId: number | null = null;
  private _aircraftId: number | null = null;
  private _departureICAO = '';
  private _breadcrumbs: Breadcrumb[] = [];
  private _departureTime = 0;
  private _maxG = 1.0;
  private _lastLandingRate = 0;
  private _wasOnGround = true;
  private _prevVerticalSpeed = 0;

  constructor(private db: CareerDatabase) {}

  // ── Lifecycle ──────────────────────────────────────

  startTracking(missionId: number | null, aircraftId: number, departureICAO: string): void {
    this._tracking = true;
    this._missionId = missionId;
    this._aircraftId = aircraftId;
    this._departureICAO = departureICAO;
    this._breadcrumbs = [];
    this._departureTime = Date.now();
    this._maxG = 1.0;
    this._lastLandingRate = 0;
    this._wasOnGround = true;
    this._prevVerticalSpeed = 0;
  }

  /**
   * Feed telemetry at ~30 s intervals.
   * Logs breadcrumbs, detects touchdowns, tracks max g.
   */
  updatePosition(telemetry: Telemetry): void {
    if (!this._tracking) return;

    this._breadcrumbs.push({
      lat: telemetry.latitude,
      lon: telemetry.longitude,
      alt: telemetry.altitude,
      timestamp: Date.now(),
    });

    // Rough g estimate from vertical speed delta
    if (this._prevVerticalSpeed !== 0) {
      const deltaVS = Math.abs(telemetry.verticalSpeed - this._prevVerticalSpeed); // fpm
      // Convert fpm delta over ~30 s to g  (1 g ≈ 1934 fpm/s → 58020 fpm/30s)
      const gEst = 1 + deltaVS / 58_020;
      if (gEst > this._maxG) this._maxG = gEst;
    }
    this._prevVerticalSpeed = telemetry.verticalSpeed;

    // Touchdown detection
    if (!this._wasOnGround && telemetry.onGround) {
      this._lastLandingRate = telemetry.verticalSpeed;
    }
    this._wasOnGround = telemetry.onGround;
  }

  /** Finalise the flight, insert into DB, return record. */
  endFlight(arrivalICAO: string): FlightRecord | null {
    if (!this._tracking || this._aircraftId === null) return null;

    const flightTimeHrs = (Date.now() - this._departureTime) / 3_600_000;
    const now = new Date().toISOString();

    const info = this.db.db.prepare(`
      INSERT INTO flights
        (mission_id, aircraft_id, departure_icao, arrival_icao,
         departure_time, arrival_time, flight_time_hrs,
         fuel_used_gal, fuel_cost, landing_rate_fpm, max_g, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      this._missionId,
      this._aircraftId,
      this._departureICAO,
      arrivalICAO,
      new Date(this._departureTime).toISOString(),
      now,
      Math.round(flightTimeHrs * 100) / 100,
      0, // fuel_used_gal — filled by EconomyEngine later
      0, // fuel_cost
      this._lastLandingRate,
      Math.round(this._maxG * 100) / 100,
      'completed',
    );

    this._tracking = false;

    return this.db.db.prepare('SELECT * FROM flights WHERE flight_id = ?')
      .get(info.lastInsertRowid) as FlightRecord;
  }

  // ── Detection Helpers ──────────────────────────────

  /** True on the frame of touchdown (air → ground transition). */
  detectLanding(telemetry: Telemetry): boolean {
    return !this._wasOnGround && telemetry.onGround;
  }

  /** Check if telemetry position is within proximity of the target airport. */
  isOnCorrectAirport(telemetry: Telemetry, targetICAO: string): boolean {
    const airport = this.db.getAirport(targetICAO);
    if (!airport) return false;
    const dist = haversine(
      telemetry.latitude, telemetry.longitude,
      airport.latitude, airport.longitude,
    );
    return dist <= AIRPORT_PROXIMITY_NM;
  }

  /** Return recorded path for map overlay. */
  getFlightPath(): Array<{ lat: number; lon: number; alt: number }> {
    return this._breadcrumbs.map(({ lat, lon, alt }) => ({ lat, lon, alt }));
  }

  /** Last recorded landing rate. */
  get landingRate(): number {
    return this._lastLandingRate;
  }

  get maxG(): number {
    return this._maxG;
  }

  isTracking(): boolean {
    return this._tracking;
  }
}

// ── Haversine ──────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * HAVERSINE_EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}
