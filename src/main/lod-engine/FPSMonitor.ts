// ═══════════════════════════════════════════════════════
// AeroSphere Studio — FPS Monitor (smoothed)
// ═══════════════════════════════════════════════════════

/** Number of frame-time samples in the rolling window. */
const WINDOW_SIZE = 30;

/**
 * Tracks frame timing via `performance.now()` and provides
 * a smoothed FPS reading over the last {@link WINDOW_SIZE}
 * samples to avoid LOD oscillation from instantaneous spikes.
 */
export class FPSMonitor {
  private samples: number[] = [];
  private lastTick = 0;

  /** Call once per frame (or once per LOD tick). */
  tick(): void {
    const now = performance.now();
    if (this.lastTick > 0) {
      const delta = now - this.lastTick;
      this.samples.push(delta);
      if (this.samples.length > WINDOW_SIZE) this.samples.shift();
    }
    this.lastTick = now;
  }

  /** Rolling-average FPS over the last {@link WINDOW_SIZE} ticks. */
  getCurrentFPS(): number {
    if (this.samples.length === 0) return 0;

    const avgDelta =
      this.samples.reduce((sum, d) => sum + d, 0) / this.samples.length;

    return avgDelta > 0 ? 1000 / avgDelta : 0;
  }

  /** Discard all samples and reset the timer. */
  reset(): void {
    this.samples = [];
    this.lastTick = 0;
  }
}
