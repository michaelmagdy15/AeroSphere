// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Flight Phase Detector
// ═══════════════════════════════════════════════════════
import type { Telemetry, FlightPhase } from '../../shared/types';

/** Minimum milliseconds between phase transitions (debounce). */
const MIN_PHASE_HOLD_MS = 5_000;

/**
 * Hysteresis thresholds — each pair is [enter, leave] so the
 * detector won't oscillate at boundary values.
 */
const THRESHOLDS = {
  takeoffSpeed:     { enter: 40,   leave: 30   },  // KIAS
  climbVS:          { enter: 300,  leave: 100  },  // fpm
  cruiseVS:         { enter: 200,  leave: 400  },  // |VS| must be below enter
  descentVS:        { enter: -300, leave: -100 },  // fpm (negative)
  approachAltAGL:   { enter: 3000, leave: 4000 },  // feet AGL
  approachSpeed:    { enter: 180,  leave: 200  },  // KIAS
} as const;

/**
 * Determines the current flight phase from raw telemetry using
 * hysteresis bands and a debounce timer to prevent rapid toggling.
 */
export class FlightPhaseDetector {
  private currentPhase: FlightPhase = 'ground';
  private lastTransitionTime = 0;

  /** Evaluate telemetry and return the current flight phase. */
  detect(telemetry: Telemetry): FlightPhase {
    const candidate = this.evaluatePhase(telemetry);

    if (candidate === this.currentPhase) return this.currentPhase;

    const now = Date.now();
    if (now - this.lastTransitionTime < MIN_PHASE_HOLD_MS) {
      return this.currentPhase;
    }

    this.currentPhase = candidate;
    this.lastTransitionTime = now;
    return this.currentPhase;
  }

  // ── Phase evaluation logic ─────────────────────────────

  private evaluatePhase(t: Telemetry): FlightPhase {
    const { onGround, airspeed, verticalSpeed, altitudeAGL, altitude } = t;

    // ── Ground ──
    if (onGround) {
      if (airspeed >= THRESHOLDS.takeoffSpeed.enter) return 'takeoff';
      return 'ground';
    }

    // ── Airborne ──
    const absVS = Math.abs(verticalSpeed);

    // Approach: low AGL + slow enough
    if (
      altitudeAGL <= THRESHOLDS.approachAltAGL.enter &&
      airspeed    <= THRESHOLDS.approachSpeed.enter &&
      verticalSpeed <= 0
    ) {
      return 'approach';
    }

    // Takeoff: recently left the ground, still climbing below transition
    if (
      this.currentPhase === 'ground' ||
      this.currentPhase === 'takeoff'
    ) {
      if (
        altitudeAGL < THRESHOLDS.approachAltAGL.enter &&
        verticalSpeed > THRESHOLDS.climbVS.leave
      ) {
        return 'takeoff';
      }
    }

    // Climb
    if (verticalSpeed >= THRESHOLDS.climbVS.enter) return 'climb';

    // Descent
    if (verticalSpeed <= THRESHOLDS.descentVS.enter) return 'descent';

    // Cruise: vertical speed within a small band
    if (absVS < THRESHOLDS.cruiseVS.enter && altitude > 10_000) return 'cruise';

    // Fallback — stay in current phase when ambiguous.
    return this.currentPhase;
  }
}
