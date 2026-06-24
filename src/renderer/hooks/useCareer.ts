import { useState, useEffect, useCallback } from 'react';
import type { Pilot, Mission, Aircraft, FlightRecord, Transaction } from '@shared/types';
import { IPC } from '@shared/ipc-channels';

const MOCK_PILOT: Pilot = {
  pilot_id: 1,
  name: 'Alex Mitchell',
  balance: 47250,
  xp: 3200,
  reputation: 78,
  license: 'CPL',
  home_base: 'KJFK',
  current_location: 'KORD',
  total_flights: 47,
  total_hours: 186.5,
};

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

const MOCK_MISSIONS: Mission[] = [
  { mission_id: 1, type: 'cargo', origin_icao: 'KJFK', dest_icao: 'KLAX', distance_nm: 2150, payload_lbs: 3200, pax_count: 0, payout: 12500, deadline: hoursFromNow(18), status: 'available', description: 'Electronics shipment to LAX' },
  { mission_id: 2, type: 'passenger', origin_icao: 'EGLL', dest_icao: 'LFPG', distance_nm: 200, payload_lbs: 900, pax_count: 6, payout: 3200, deadline: hoursFromNow(8), status: 'available', description: 'Business group transfer to Paris' },
  { mission_id: 3, type: 'charter', origin_icao: 'RJTT', dest_icao: 'RKSI', distance_nm: 750, payload_lbs: 1100, pax_count: 4, payout: 8900, deadline: hoursFromNow(12), status: 'available', description: 'Charter flight Tokyo to Seoul' },
  { mission_id: 4, type: 'medical', origin_icao: 'KORD', dest_icao: 'KATL', distance_nm: 590, payload_lbs: 450, pax_count: 2, payout: 7500, deadline: hoursFromNow(4), status: 'available', description: 'Urgent organ transport' },
  { mission_id: 5, type: 'vip', origin_icao: 'EDDF', dest_icao: 'LIRF', distance_nm: 520, payload_lbs: 600, pax_count: 3, payout: 15000, deadline: hoursFromNow(10), status: 'available', description: 'VIP client to Rome' },
  { mission_id: 6, type: 'tour', origin_icao: 'KSFO', dest_icao: 'PHNL', distance_nm: 2100, payload_lbs: 800, pax_count: 5, payout: 800, deadline: hoursFromNow(24), status: 'available', description: 'Scenic Hawaiian island tour' },
];

const MOCK_FLEET: Aircraft[] = [
  { aircraft_id: 1, type_id: 1, registration: 'N172SP', location_icao: 'KJFK', condition_pct: 95, total_hours: 342.5, hours_since_mx: 45, fuel_onboard_gal: 48, status: 'available' },
  { aircraft_id: 2, type_id: 2, registration: 'N320AE', location_icao: 'KORD', condition_pct: 62, total_hours: 1280.3, hours_since_mx: 180, fuel_onboard_gal: 410, status: 'in_flight' },
  { aircraft_id: 3, type_id: 3, registration: 'N750GX', location_icao: 'KLAX', condition_pct: 34, total_hours: 4520.8, hours_since_mx: 490, fuel_onboard_gal: 1200, status: 'maintenance' },
];

const MOCK_FLIGHT_LOG: FlightRecord[] = [
  { flight_id: 1, mission_id: 1, aircraft_id: 1, departure_icao: 'KJFK', arrival_icao: 'KBOS', flight_time_hrs: 1.2, fuel_used_gal: 18.4, fuel_cost: 112, landing_rate_fpm: 78, status: 'completed' },
  { flight_id: 2, mission_id: 2, aircraft_id: 2, departure_icao: 'KORD', arrival_icao: 'KDFW', flight_time_hrs: 2.8, fuel_used_gal: 165, fuel_cost: 924, landing_rate_fpm: 145, status: 'completed' },
  { flight_id: 3, mission_id: null, aircraft_id: 1, departure_icao: 'KBOS', arrival_icao: 'KPHL', flight_time_hrs: 1.5, fuel_used_gal: 22.1, fuel_cost: 135, landing_rate_fpm: 230, status: 'diverted' },
  { flight_id: 4, mission_id: 3, aircraft_id: 3, departure_icao: 'KLAX', arrival_icao: 'KSFO', flight_time_hrs: 1.1, fuel_used_gal: 280, fuel_cost: 1568, landing_rate_fpm: 95, status: 'completed' },
  { flight_id: 5, mission_id: 4, aircraft_id: 2, departure_icao: 'KDFW', arrival_icao: 'KORD', flight_time_hrs: 2.6, fuel_used_gal: 152, fuel_cost: 851, landing_rate_fpm: 187, status: 'completed' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { txn_id: 1, category: 'mission_payout', amount: 12500, balance_after: 47250, description: 'Cargo delivery KJFK → KLAX', timestamp: hoursFromNow(-2) },
  { txn_id: 2, category: 'fuel', amount: -924, balance_after: 34750, description: 'Jet-A refuel at KORD', timestamp: hoursFromNow(-5) },
  { txn_id: 3, category: 'maintenance', amount: -3200, balance_after: 35674, description: 'Scheduled 100hr inspection N172SP', timestamp: hoursFromNow(-12) },
  { txn_id: 4, category: 'landing_fee', amount: -85, balance_after: 38874, description: 'Landing fee KJFK', timestamp: hoursFromNow(-14) },
  { txn_id: 5, category: 'aircraft_purchase', amount: -28000, balance_after: 38959, description: 'Purchased N172SP (Cessna 172)', timestamp: hoursFromNow(-48) },
  { txn_id: 6, category: 'insurance', amount: -450, balance_after: 66959, description: 'Monthly hull insurance', timestamp: hoursFromNow(-72) },
  { txn_id: 7, category: 'bonus', amount: 2000, balance_after: 67409, description: 'Perfect landing streak bonus', timestamp: hoursFromNow(-96) },
  { txn_id: 8, category: 'fuel', amount: -1568, balance_after: 65409, description: 'Jet-A refuel at KLAX', timestamp: hoursFromNow(-100) },
];

export function useCareer() {
  const [pilot, setPilot] = useState<Pilot>(MOCK_PILOT);
  const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS);
  const [fleet, setFleet] = useState<Aircraft[]>(MOCK_FLEET);
  const [flightLog] = useState<FlightRecord[]>(MOCK_FLIGHT_LOG);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  useEffect(() => {
    const api = window.aerosphere;
    if (!api) return;

    api.invoke(IPC.CAREER_GET_PILOT).then((p) => {
      if (p) setPilot(p as Pilot);
    });
    api.invoke(IPC.CAREER_GET_MISSIONS).then((m) => {
      if (m) setMissions(m as Mission[]);
    });
    api.invoke(IPC.CAREER_GET_FLEET).then((f) => {
      if (f) setFleet(f as Aircraft[]);
    });
    api.invoke(IPC.CAREER_GET_TRANSACTIONS).then((t) => {
      if (t) setTransactions(t as Transaction[]);
    });
  }, []);

  const acceptMission = useCallback(async (missionId: number) => {
    const api = window.aerosphere;
    if (api) {
      await api.invoke(IPC.CAREER_ACCEPT_MISSION, missionId);
      const m = await api.invoke(IPC.CAREER_GET_MISSIONS);
      if (m) setMissions(m as Mission[]);
      return;
    }

    setMissions((prev) =>
      prev.map((m) => (m.mission_id === missionId ? { ...m, status: 'accepted' as const } : m)),
    );
  }, []);

  const refreshMissions = useCallback(async () => {
    const api = window.aerosphere;
    if (!api) return;
    const m = await api.invoke(IPC.CAREER_GET_MISSIONS);
    if (m) setMissions(m as Mission[]);
  }, []);

  const refreshFleet = useCallback(async () => {
    const api = window.aerosphere;
    if (!api) return;
    const f = await api.invoke(IPC.CAREER_GET_FLEET);
    if (f) setFleet(f as Aircraft[]);
  }, []);

  return { pilot, missions, fleet, flightLog, transactions, acceptMission, refreshMissions, refreshFleet };
}
