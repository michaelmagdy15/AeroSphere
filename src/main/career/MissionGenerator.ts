// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Procedural Mission Generator
// ═══════════════════════════════════════════════════════

import type { Mission, MissionType } from '../../shared/types';
import { HAVERSINE_EARTH_RADIUS_NM, MISSION_BATCH_SIZE } from '../../shared/constants';
import type CareerDatabase from './CareerDatabase';
import type { AircraftType } from './CareerDatabase';

/** Per-NM base rates by mission type. */
const BASE_RATES: Record<MissionType, number> = {
  cargo: 0.15,
  passenger: 0.25,
  charter: 0.40,
  medical: 0.50,
  vip: 0.60,
  tour: 0.35,
};

/** Mission types weighted by aircraft category. */
const CATEGORY_MISSION_WEIGHTS: Record<string, { type: MissionType; weight: number }[]> = {
  HELI: [
    { type: 'tour', weight: 30 },
    { type: 'medical', weight: 30 },
    { type: 'charter', weight: 20 },
    { type: 'vip', weight: 15 },
    { type: 'cargo', weight: 5 },
  ],
  SEP: [
    { type: 'tour', weight: 25 },
    { type: 'charter', weight: 30 },
    { type: 'passenger', weight: 25 },
    { type: 'cargo', weight: 15 },
    { type: 'vip', weight: 5 },
  ],
  MEP: [
    { type: 'charter', weight: 25 },
    { type: 'passenger', weight: 25 },
    { type: 'cargo', weight: 25 },
    { type: 'vip', weight: 15 },
    { type: 'medical', weight: 10 },
  ],
  SET: [
    { type: 'cargo', weight: 30 },
    { type: 'passenger', weight: 25 },
    { type: 'charter', weight: 20 },
    { type: 'medical', weight: 15 },
    { type: 'vip', weight: 10 },
  ],
  MET: [
    { type: 'passenger', weight: 30 },
    { type: 'cargo', weight: 30 },
    { type: 'charter', weight: 15 },
    { type: 'medical', weight: 15 },
    { type: 'vip', weight: 10 },
  ],
  JET: [
    { type: 'passenger', weight: 35 },
    { type: 'cargo', weight: 25 },
    { type: 'charter', weight: 15 },
    { type: 'vip', weight: 15 },
    { type: 'medical', weight: 10 },
  ],
};

interface CandidateAirport {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  distance: number;
}

export default class MissionGenerator {
  constructor(private db: CareerDatabase) {}

  /**
   * Generate a batch of missions from the pilot's current airport,
   * filtered by the given aircraft's range and category.
   */
  generateBatch(currentICAO: string, aircraftTypeId: number, count: number = MISSION_BATCH_SIZE): Mission[] {
    const acType = this.db.getAircraftType(aircraftTypeId);
    if (!acType) return [];

    const origin = this.db.getAirport(currentICAO);
    if (!origin) return [];

    // Bounding box pre-filter (1° latitude ≈ 60 NM)
    const maxRange = acType.max_range_nm;
    const latDelta = maxRange / 60;
    const lonDelta = maxRange / (60 * Math.cos(origin.latitude * Math.PI / 180));

    const rows = this.db.db.prepare(`
      SELECT icao, name, lat, lon, type FROM airports
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
        AND icao != ?
    `).all(
      origin.latitude - latDelta, origin.latitude + latDelta,
      origin.longitude - lonDelta, origin.longitude + lonDelta,
      currentICAO,
    ) as { icao: string; name: string; lat: number; lon: number; type: string }[];

    // Compute actual haversine distance, filter within range
    const candidates: CandidateAirport[] = [];
    for (const row of rows) {
      const d = haversine(origin.latitude, origin.longitude, row.lat, row.lon);
      if (d > 10 && d <= maxRange) {
        candidates.push({ ...row, distance: d });
      }
    }

    if (candidates.length === 0) return [];

    const missions: Mission[] = [];
    const selected = this.weightedSelect(candidates, count, maxRange);

    for (const dest of selected) {
      const mType = this.pickMissionType(acType.category);
      const payload = this.randomPayload(mType, acType);
      const pax = this.randomPax(mType, acType);
      const payout = this.calculatePayout(mType, dest.distance, payload, pax);
      const deadline = this.generateDeadline(dest.distance);
      const description = this.generateDescription(
        mType, currentICAO, dest.icao, dest.name, payload, pax,
      );

      const mission: Mission = {
        type: mType,
        origin_icao: currentICAO,
        dest_icao: dest.icao,
        distance_nm: Math.round(dest.distance),
        payload_lbs: payload,
        pax_count: pax,
        payout: Math.round(payout),
        deadline,
        min_aircraft_category: acType.category,
        status: 'available',
        description,
      };

      const info = this.db.db.prepare(`
        INSERT INTO missions
          (type, origin_icao, dest_icao, distance_nm, payload_lbs, pax_count,
           payout, deadline, min_aircraft_category, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mission.type, mission.origin_icao, mission.dest_icao,
        mission.distance_nm, mission.payload_lbs, mission.pax_count,
        mission.payout, mission.deadline, mission.min_aircraft_category,
        mission.description, mission.status,
      );
      mission.mission_id = Number(info.lastInsertRowid);
      missions.push(mission);
    }

    return missions;
  }

  // ── Private Helpers ────────────────────────────────

  /** Weighted random selection: bell curve around 50% max range, airport size bonus. */
  private weightedSelect(candidates: CandidateAirport[], count: number, maxRange: number): CandidateAirport[] {
    const idealDist = maxRange * 0.5;
    const weights = candidates.map(c => {
      // Gaussian-like weight centred on ideal distance
      const distDelta = (c.distance - idealDist) / (maxRange * 0.3);
      let w = Math.exp(-0.5 * distDelta * distDelta);

      // Airport size bonus
      if (c.type === 'large_airport') w *= 2.0;
      else if (c.type === 'medium_airport') w *= 1.5;

      return w;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const selected: CandidateAirport[] = [];
    const used = new Set<string>();

    const n = Math.min(count, candidates.length);
    for (let i = 0; i < n; i++) {
      let r = Math.random() * totalWeight;
      for (let j = 0; j < candidates.length; j++) {
        if (used.has(candidates[j].icao)) continue;
        r -= weights[j];
        if (r <= 0) {
          selected.push(candidates[j]);
          used.add(candidates[j].icao);
          break;
        }
      }
    }

    return selected;
  }

  private pickMissionType(category: string): MissionType {
    const pool = CATEGORY_MISSION_WEIGHTS[category] ?? CATEGORY_MISSION_WEIGHTS['JET'];
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) return entry.type;
    }
    return pool[0].type;
  }

  private randomPayload(type: MissionType, ac: AircraftType): number {
    if (type === 'tour') return 0;
    if (type === 'passenger' || type === 'vip') return 0;
    // Cargo/charter/medical: 30-90% of max payload
    const frac = 0.3 + Math.random() * 0.6;
    return Math.round(ac.max_payload_lbs * frac);
  }

  private randomPax(type: MissionType, ac: AircraftType): number {
    if (type === 'cargo') return 0;
    if (type === 'vip') return Math.min(1 + Math.floor(Math.random() * 4), ac.max_pax);
    if (type === 'tour') return Math.min(1 + Math.floor(Math.random() * 6), ac.max_pax);
    if (type === 'medical') return Math.min(1 + Math.floor(Math.random() * 3), ac.max_pax);
    // Passenger/charter: 40-95% of max pax
    const frac = 0.4 + Math.random() * 0.55;
    return Math.min(Math.max(1, Math.round(ac.max_pax * frac)), ac.max_pax);
  }

  private calculatePayout(type: MissionType, distance: number, payload: number, pax: number): number {
    const baseRate = BASE_RATES[type];
    const weightFactor = payload > 0 ? payload / 1000 : Math.max(pax * 0.5, 1);
    return baseRate * distance * weightFactor;
  }

  private generateDeadline(distanceNM: number): string {
    const hours = distanceNM < 500 ? 24 : 48;
    const deadline = new Date(Date.now() + hours * 3600_000);
    return deadline.toISOString();
  }

  private generateDescription(
    type: MissionType, origin: string, destIcao: string, destName: string,
    payload: number, pax: number,
  ): string {
    const dest = destName || destIcao;
    switch (type) {
      case 'cargo':
        return `Transport ${payload.toLocaleString()} lbs of cargo from ${origin} to ${dest}.`;
      case 'passenger':
        return `Fly ${pax} passengers from ${origin} to ${dest}.`;
      case 'charter':
        return `Charter flight: deliver ${pax > 0 ? `${pax} passengers` : `${payload.toLocaleString()} lbs`} from ${origin} to ${dest}.`;
      case 'medical':
        return `URGENT: Medical evacuation from ${origin} to ${dest}. ${pax} patient${pax > 1 ? 's' : ''} aboard.`;
      case 'vip':
        return `VIP transport: ${pax} executive${pax > 1 ? 's' : ''} from ${origin} to ${dest}. Smooth landing expected.`;
      case 'tour':
        return `Scenic tour for ${pax} guest${pax > 1 ? 's' : ''} departing ${origin}, landing at ${dest}.`;
    }
  }
}

// ── Haversine (module-level) ───────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * HAVERSINE_EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}
