// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Fuel Price Service
// ═══════════════════════════════════════════════════════

import type CareerDatabase from './CareerDatabase';

/** Regional average fuel prices in USD / gallon. */
interface RegionPrices {
  jeta: number;
  avgas: number;
}

const REGION_PRICES: Record<string, RegionPrices> = {
  'North America': { jeta: 6.50, avgas: 5.80 },
  'Europe':        { jeta: 7.80, avgas: 7.20 },
  'Asia':          { jeta: 7.20, avgas: 6.50 },
  'Middle East':   { jeta: 4.80, avgas: 5.00 },
  'Africa':        { jeta: 8.50, avgas: 7.80 },
  'South America': { jeta: 7.00, avgas: 6.40 },
  'Oceania':       { jeta: 7.50, avgas: 6.80 },
  'default':       { jeta: 7.00, avgas: 6.50 },
};

const COUNTRY_REGION: Record<string, string> = {
  // North America
  US: 'North America', CA: 'North America', MX: 'North America',
  // Europe
  GB: 'Europe', DE: 'Europe', FR: 'Europe', IT: 'Europe', ES: 'Europe',
  NL: 'Europe', BE: 'Europe', CH: 'Europe', AT: 'Europe', SE: 'Europe',
  NO: 'Europe', DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe',
  CZ: 'Europe', PT: 'Europe', GR: 'Europe', RO: 'Europe', HU: 'Europe',
  IS: 'Europe', LU: 'Europe', SK: 'Europe', BG: 'Europe', HR: 'Europe',
  RS: 'Europe', UA: 'Europe', TR: 'Europe',
  // Asia
  JP: 'Asia', CN: 'Asia', KR: 'Asia', IN: 'Asia', TH: 'Asia',
  SG: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia', VN: 'Asia',
  TW: 'Asia', HK: 'Asia', PK: 'Asia', BD: 'Asia',
  // Middle East
  AE: 'Middle East', SA: 'Middle East', QA: 'Middle East', KW: 'Middle East',
  BH: 'Middle East', OM: 'Middle East', IL: 'Middle East', JO: 'Middle East',
  IQ: 'Middle East', IR: 'Middle East',
  // Africa
  ZA: 'Africa', EG: 'Africa', NG: 'Africa', KE: 'Africa', ET: 'Africa',
  MA: 'Africa', TN: 'Africa', GH: 'Africa', TZ: 'Africa', SN: 'Africa',
  // South America
  BR: 'South America', AR: 'South America', CL: 'South America',
  CO: 'South America', PE: 'South America', VE: 'South America',
  EC: 'South America', UY: 'South America', PY: 'South America',
  BO: 'South America',
  // Oceania
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
};

/** Maximum random variance ±15%. */
const VARIANCE = 0.15;

export default class FuelPriceService {
  constructor(private db: CareerDatabase) {}

  /**
   * Regenerate fuel prices for all airports in the database.
   * Applies regional base price ± random 15% variance.
   */
  updatePrices(): void {
    const update = this.db.db.prepare(
      'UPDATE airports SET jeta_price = ?, avgas_price = ? WHERE icao = ?',
    );

    const batchSize = 1000;
    let offset = 0;

    const process = this.db.db.transaction(() => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rows = this.db.db.prepare(
          'SELECT icao, country, has_jeta, has_avgas FROM airports LIMIT ? OFFSET ?',
        ).all(batchSize, offset) as { icao: string; country: string; has_jeta: number; has_avgas: number }[];

        if (rows.length === 0) break;

        for (const row of rows) {
          const region = this.getRegionForCountry(row.country);
          const prices = REGION_PRICES[region] ?? REGION_PRICES['default'];

          const jetaPrice = row.has_jeta ? applyVariance(prices.jeta) : null;
          const avgasPrice = row.has_avgas ? applyVariance(prices.avgas) : null;

          update.run(jetaPrice, avgasPrice, row.icao);
        }

        offset += batchSize;
      }
    });

    process();
  }

  /** Get the fuel price for a specific airport and fuel type. */
  getPrice(icao: string, fuelType: 'JetA' | 'AvGas'): number {
    const airport = this.db.getAirport(icao);

    if (fuelType === 'JetA' && airport?.jeta_price != null) return airport.jeta_price;
    if (fuelType === 'AvGas' && airport?.avgas_price != null) return airport.avgas_price;

    // Fallback to regional default
    const region = airport ? this.getRegionForCountry(airport.country) : 'default';
    const prices = REGION_PRICES[region] ?? REGION_PRICES['default'];
    return fuelType === 'JetA' ? prices.jeta : prices.avgas;
  }

  /** Map a 2-letter ISO country code to a pricing region. */
  getRegionForCountry(countryCode: string): string {
    return COUNTRY_REGION[countryCode?.toUpperCase()] ?? 'default';
  }
}

function applyVariance(base: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * VARIANCE;
  return Math.round(base * factor * 100) / 100;
}
