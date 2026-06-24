// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Airport Data Utilities
// ═══════════════════════════════════════════════════════

import type { Airport } from '../../shared/types';
import { HAVERSINE_EARTH_RADIUS_NM } from '../../shared/constants';
import type CareerDatabase from './CareerDatabase';

export default class AirportDatabase {
  constructor(private db: CareerDatabase) {}

  // ── CSV Parsing ────────────────────────────────────

  /**
   * Parse an OurAirports-format CSV string into Airport objects.
   * Skips closed airports and entries without a usable ICAO-like identifier.
   */
  parseOurAirportsCSV(csvString: string): Airport[] {
    const lines = csvString.split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const col = (name: string) => header.indexOf(name);

    const airports: Airport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      const ident = strip(cols[col('ident')]);
      const type = strip(cols[col('type')]);

      if (!ident || type === 'closed') continue;

      const lat = parseFloat(cols[col('latitude_deg')] ?? '');
      const lon = parseFloat(cols[col('longitude_deg')] ?? '');
      if (isNaN(lat) || isNaN(lon)) continue;

      airports.push({
        icao: ident,
        name: strip(cols[col('name')]) || ident,
        latitude: lat,
        longitude: lon,
        elevation_ft: parseInt(cols[col('elevation_ft')] ?? '0', 10) || 0,
        type,
        country: strip(cols[col('iso_country')]),
        region: strip(cols[col('iso_region')]),
        municipality: strip(cols[col('municipality')]),
        has_jeta: type === 'large_airport' || type === 'medium_airport',
        has_avgas: type !== 'large_airport',
        jeta_price: null,
        avgas_price: null,
      });
    }

    return airports;
  }

  // ── Spatial Queries ────────────────────────────────

  /**
   * Find airports within a radius (NM) of a lat/lon point.
   * Uses bounding-box pre-filter then haversine refinement.
   */
  getNearbyAirports(lat: number, lon: number, radiusNM: number): Airport[] {
    const latDelta = radiusNM / 60;
    const lonDelta = radiusNM / (60 * Math.cos(lat * Math.PI / 180));

    const rows = this.db.db.prepare(`
      SELECT * FROM airports
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
    `).all(
      lat - latDelta, lat + latDelta,
      lon - lonDelta, lon + lonDelta,
    ) as (Airport & { lat: number; lon: number })[];

    return rows
      .map(r => ({
        airport: mapRow(r),
        distance: haversine(lat, lon, r.lat, r.lon),
      }))
      .filter(e => e.distance <= radiusNM)
      .sort((a, b) => a.distance - b.distance)
      .map(e => e.airport);
  }

  // ── Lookup Queries ─────────────────────────────────

  getAirportsByCountry(countryCode: string): Airport[] {
    return (this.db.db.prepare('SELECT * FROM airports WHERE country = ? ORDER BY name')
      .all(countryCode) as any[]).map(mapRow);
  }

  /**
   * Search airports by ICAO (exact), name, or municipality (partial).
   * Returns at most 50 results.
   */
  searchAirports(query: string): Airport[] {
    const upper = query.toUpperCase();
    const like = `%${query}%`;

    return (this.db.db.prepare(`
      SELECT * FROM airports
      WHERE icao = ?
         OR UPPER(name) LIKE UPPER(?)
         OR UPPER(municipality) LIKE UPPER(?)
      ORDER BY
        CASE WHEN icao = ? THEN 0 ELSE 1 END,
        name
      LIMIT 50
    `).all(upper, like, like, upper) as any[]).map(mapRow);
  }
}

// ── Helpers ────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * HAVERSINE_EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

/** Map a raw DB row (lat/lon columns) to the Airport interface (latitude/longitude). */
function mapRow(row: any): Airport {
  return {
    icao: row.icao,
    name: row.name,
    latitude: row.lat,
    longitude: row.lon,
    elevation_ft: row.elevation_ft,
    type: row.type,
    country: row.country,
    region: row.region,
    municipality: row.municipality,
    has_jeta: !!row.has_jeta,
    has_avgas: !!row.has_avgas,
    jeta_price: row.jeta_price,
    avgas_price: row.avgas_price,
  };
}

function strip(s: string | undefined): string {
  return (s ?? '').replace(/^"|"$/g, '').trim();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}
