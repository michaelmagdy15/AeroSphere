// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Landing Quality Scorer
// ═══════════════════════════════════════════════════════

export interface LandingScore {
  score: number;
  grade: string;
  message: string;
  xpBonus: number;
  penalty: number;
}

/**
 * Evaluate a touchdown by vertical speed and g-force.
 *
 * @param verticalSpeedFPM  Feet per minute (negative = descending)
 * @param gForce            Peak g-force on contact (1.0 = normal gravity)
 */
export function scoreLanding(verticalSpeedFPM: number, gForce: number): LandingScore {
  const fpm = Math.abs(verticalSpeedFPM);

  // g-force override: anything above 2g is Hard at best
  const gOverride = gForce > 2.0;

  if (!gOverride && fpm < 60) {
    return { score: 100, grade: 'Perfect', xpBonus: 50, penalty: 0, message: 'Butter! Perfect touchdown.' };
  }
  if (!gOverride && fpm < 120) {
    return { score: 85, grade: 'Smooth', xpBonus: 25, penalty: 0, message: 'Smooth landing, well done.' };
  }
  if (!gOverride && fpm < 200) {
    return { score: 65, grade: 'Acceptable', xpBonus: 10, penalty: 0, message: 'Acceptable landing.' };
  }
  if (fpm < 300) {
    return { score: 40, grade: 'Hard', xpBonus: 0, penalty: 50, message: 'Hard landing. Passengers noticed.' };
  }
  if (fpm < 500) {
    return { score: 20, grade: 'Rough', xpBonus: 0, penalty: 150, message: 'Rough landing! Inspect aircraft.' };
  }
  return { score: 0, grade: 'Crash', xpBonus: 0, penalty: 500, message: 'Crash landing! Aircraft damaged.' };
}
