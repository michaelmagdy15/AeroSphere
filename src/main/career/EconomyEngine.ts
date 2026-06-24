// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Economy Engine
// ═══════════════════════════════════════════════════════

import type {
  Transaction, TransactionCategory, FlightRecord, Mission,
} from '../../shared/types';
import type CareerDatabase from './CareerDatabase';
import type { AircraftType } from './CareerDatabase';

/** Default fuel prices when airport has no pricing data. */
const DEFAULT_JETA_PRICE = 6.50;
const DEFAULT_AVGAS_PRICE = 5.80;

export interface FlightSettlement {
  revenue: number;
  expenses: number;
  profit: number;
  transactions: Transaction[];
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  profit: number;
  flightCount: number;
}

export default class EconomyEngine {
  constructor(private db: CareerDatabase) {}

  // ── Cost Calculators ───────────────────────────────

  calculateFuelCost(gallonsUsed: number, airportICAO: string, fuelType: 'JetA' | 'AvGas'): number {
    const airport = this.db.getAirport(airportICAO);
    let price: number;
    if (fuelType === 'JetA') {
      price = airport?.jeta_price ?? DEFAULT_JETA_PRICE;
    } else {
      price = airport?.avgas_price ?? DEFAULT_AVGAS_PRICE;
    }
    return Math.round(gallonsUsed * price * 100) / 100;
  }

  calculateLandingFee(mtowLbs: number, airportICAO: string): number {
    let fee: number;
    if (mtowLbs < 6_000) {
      fee = 0; // GA exempt
    } else if (mtowLbs < 25_000) {
      fee = 25 + 0.005 * mtowLbs;
    } else if (mtowLbs < 100_000) {
      fee = 75 + 0.008 * mtowLbs;
    } else {
      fee = 200 + 0.012 * mtowLbs;
    }

    const airport = this.db.getAirport(airportICAO);
    if (airport?.type === 'large_airport') fee *= 1.5;

    return Math.round(fee * 100) / 100;
  }

  calculateMaintenanceCost(flightHours: number, conditionPct: number): number {
    let ratePerHour: number;
    if (conditionPct > 80) {
      ratePerHour = 45;
    } else if (conditionPct > 50) {
      ratePerHour = 85;
    } else {
      ratePerHour = 150;
    }
    return Math.round(flightHours * ratePerHour * 100) / 100;
  }

  // ── Flight Settlement ──────────────────────────────

  processFlightCompletion(
    flight: FlightRecord,
    mission: Mission | null,
    aircraftTypeId: number,
  ): FlightSettlement {
    const acType = this.db.getAircraftType(aircraftTypeId);
    const txns: Transaction[] = [];
    let revenue = 0;
    let expenses = 0;

    // Fuel cost
    const fuelType = acType?.fuel_type ?? 'JetA';
    const fuelCost = this.calculateFuelCost(
      flight.fuel_used_gal,
      flight.arrival_icao,
      fuelType as 'JetA' | 'AvGas',
    );
    if (fuelCost > 0) {
      txns.push(this.applyTransaction('fuel', -fuelCost, `Fuel: ${flight.fuel_used_gal.toFixed(1)} gal`, flight.flight_id));
      expenses += fuelCost;
    }

    // Landing fee
    const landingFee = this.calculateLandingFee(acType?.mtow_lbs ?? 0, flight.arrival_icao);
    if (landingFee > 0) {
      txns.push(this.applyTransaction('landing_fee', -landingFee, `Landing fee at ${flight.arrival_icao}`, flight.flight_id));
      expenses += landingFee;
    }

    // Maintenance
    const aircraft = this.db.db.prepare('SELECT condition_pct FROM aircraft WHERE aircraft_id = ?')
      .get(flight.aircraft_id) as { condition_pct: number } | undefined;
    const mxCost = this.calculateMaintenanceCost(flight.flight_time_hrs, aircraft?.condition_pct ?? 100);
    if (mxCost > 0) {
      txns.push(this.applyTransaction('maintenance', -mxCost, `Maintenance: ${flight.flight_time_hrs.toFixed(1)} hrs`, flight.flight_id));
      expenses += mxCost;
    }

    // Mission payout
    if (mission && flight.status === 'completed') {
      txns.push(this.applyTransaction('mission_payout', mission.payout, `Mission payout: ${mission.description ?? mission.type}`, flight.flight_id));
      revenue += mission.payout;
    }

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      transactions: txns,
    };
  }

  // ── Ledger ─────────────────────────────────────────

  applyTransaction(
    category: TransactionCategory,
    amount: number,
    description: string,
    flightId?: number,
  ): Transaction {
    const pilot = this.db.getPilot();
    const currentBalance = pilot?.balance ?? 0;
    const newBalance = Math.round((currentBalance + amount) * 100) / 100;

    const info = this.db.db.prepare(`
      INSERT INTO transactions (category, amount, balance_after, description, flight_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, amount, newBalance, description, flightId ?? null);

    this.db.db.prepare('UPDATE pilot SET balance = ?').run(newBalance);

    return this.db.db.prepare('SELECT * FROM transactions WHERE txn_id = ?')
      .get(info.lastInsertRowid) as Transaction;
  }

  getBalance(): number {
    return this.db.getPilot()?.balance ?? 0;
  }

  getFinancialSummary(days: number): FinancialSummary {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const rows = this.db.db.prepare(`
      SELECT amount FROM transactions WHERE timestamp >= ?
    `).all(since) as { amount: number }[];

    let revenue = 0;
    let expenses = 0;
    for (const r of rows) {
      if (r.amount > 0) revenue += r.amount;
      else expenses += Math.abs(r.amount);
    }

    const flightCount = (this.db.db.prepare(`
      SELECT COUNT(*) AS c FROM flights WHERE departure_time >= ?
    `).get(since) as { c: number }).c;

    return {
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      profit: Math.round((revenue - expenses) * 100) / 100,
      flightCount,
    };
  }
}
