// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Dynamic LOD Controller (PID)
// ═══════════════════════════════════════════════════════
import type {
  Telemetry,
  FlightPhase,
  LODTargets,
  LODSettings,
  CloudQuality,
} from '../../shared/types';
import {
  LOD_DEFAULT_TARGET_FPS,
  LOD_MIN_TLOD,
  LOD_MAX_TLOD,
  LOD_MIN_OLOD,
  LOD_MAX_OLOD,
  PID_KP,
  PID_KI,
  PID_KD,
} from '../../shared/constants';
import { FlightPhaseDetector } from './FlightPhaseDetector';

// ── Altitude → Base TLOD curve ───────────────────────────
// Linear interpolation between breakpoints.
const ALTITUDE_CURVE: readonly [altitude: number, tlod: number][] = [
  [0,      100],
  [10_000, 250],
  [20_000, 450],
  [30_000, 800],
];

/** OLOD multipliers per flight phase (relative to base TLOD). */
const OLOD_PHASE_FACTOR: Record<FlightPhase, number> = {
  ground:   0.50,
  takeoff:  0.50,
  climb:    0.45,
  cruise:   0.35,
  descent:  0.45,
  approach: 0.60,
};

/** Cloud quality ladder — ordered worst-to-best. */
const CLOUD_LADDER: readonly CloudQuality[] = ['low', 'medium', 'high', 'ultra'];

/** FPS threshold below which we begin degrading cloud quality. */
const CLOUD_CRITICAL_FPS_RATIO = 0.80;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/**
 * PID-style feedback controller that maps (telemetry + currentFPS)
 * to a set of LOD targets, adjusting TLOD, OLOD, and cloud quality
 * each tick.
 */
export class DynamicLODController {
  private phaseDetector = new FlightPhaseDetector();

  // PID state
  private prevError   = 0;
  private integral    = 0;
  private lastUpdateT = 0;

  // Active configuration
  private settings: LODSettings = {
    targetFPS: LOD_DEFAULT_TARGET_FPS,
    minTLOD:   LOD_MIN_TLOD,
    maxTLOD:   LOD_MAX_TLOD,
    minOLOD:   LOD_MIN_OLOD,
    maxOLOD:   LOD_MAX_OLOD,
    enabled:   true,
    vrMode:    false,
  };

  private cloudQuality: CloudQuality = 'ultra';

  // ── Public API ─────────────────────────────────────────

  /** Hot-swap controller settings without resetting PID state. */
  setSettings(next: LODSettings): void {
    this.settings = { ...next };
  }

  /**
   * Compute new LOD targets.
   *
   * @param telemetry Current sim telemetry snapshot.
   * @param currentFPS Smoothed FPS reading from {@link FPSMonitor}.
   */
  update(telemetry: Telemetry, currentFPS: number): LODTargets {
    const phase = this.phaseDetector.detect(telemetry);

    // ── Base TLOD from altitude curve ──
    const baseTLOD = this.altitudeToTLOD(telemetry.altitude);

    // ── PID adjustment ──
    const pidAdjust = this.pidStep(currentFPS);

    // Clamp PID output to ±50 % of base target.
    const maxDelta  = baseTLOD * 0.5;
    const clampedPID = clamp(pidAdjust, -maxDelta, maxDelta);

    // Final TLOD
    const tlod = clamp(
      baseTLOD + clampedPID,
      this.settings.minTLOD,
      this.settings.maxTLOD,
    );

    // ── OLOD — phase-dependent fraction of TLOD ──
    const oFactor = OLOD_PHASE_FACTOR[phase];
    const olod = clamp(
      tlod * oFactor,
      this.settings.minOLOD,
      this.settings.maxOLOD,
    );

    // ── Cloud quality — downgrade when FPS is critical ──
    this.adjustCloudQuality(currentFPS);

    return { tlod, olod, cloudQuality: this.cloudQuality, phase };
  }

  // ── PID internals ──────────────────────────────────────

  private pidStep(currentFPS: number): number {
    const now = performance.now();
    const dt  = this.lastUpdateT > 0
      ? (now - this.lastUpdateT) / 1000   // seconds
      : 0;
    this.lastUpdateT = now;

    if (dt <= 0) return 0;

    // Error: positive = FPS above target → room to increase LOD.
    const error = currentFPS - this.settings.targetFPS;

    // Proportional
    const p = PID_KP * error;

    // Integral with anti-windup clamp
    this.integral = clamp(this.integral + error * dt, -1, 1);
    const i = PID_KI * this.integral;

    // Derivative
    const d = PID_KD * ((error - this.prevError) / dt);
    this.prevError = error;

    return p + i + d;
  }

  // ── Altitude → TLOD curve ──────────────────────────────

  private altitudeToTLOD(altitude: number): number {
    const curve = ALTITUDE_CURVE;

    if (altitude <= curve[0][0]) return curve[0][1];
    if (altitude >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

    for (let idx = 1; idx < curve.length; idx++) {
      const [altHi, tlodHi] = curve[idx];
      const [altLo, tlodLo] = curve[idx - 1];

      if (altitude <= altHi) {
        const t = (altitude - altLo) / (altHi - altLo);
        return tlodLo + t * (tlodHi - tlodLo);
      }
    }

    return curve[curve.length - 1][1];
  }

  // ── Cloud Quality Management ───────────────────────────

  private adjustCloudQuality(currentFPS: number): void {
    const criticalFPS = this.settings.targetFPS * CLOUD_CRITICAL_FPS_RATIO;
    const currentIdx  = CLOUD_LADDER.indexOf(this.cloudQuality);

    if (currentFPS < criticalFPS && currentIdx > 0) {
      // Downgrade one step.
      this.cloudQuality = CLOUD_LADDER[currentIdx - 1];
    } else if (
      currentFPS >= this.settings.targetFPS &&
      currentIdx < CLOUD_LADDER.length - 1
    ) {
      // Upgrade one step when back at target.
      this.cloudQuality = CLOUD_LADDER[currentIdx + 1];
    }
  }
}
