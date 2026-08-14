export class FrameLimiter {
  private accumulator = 0;

  reset(): void { this.accumulator = 0; }

  advance(elapsedSeconds: number, fpsLimit: number): number | null {
    const elapsed = Math.min(Math.max(elapsedSeconds, 0), 0.25);
    this.accumulator += elapsed;
    if (fpsLimit <= 0) {
      const delta = Math.min(this.accumulator, 0.25);
      this.accumulator = 0;
      return delta;
    }
    const threshold = 1 / fpsLimit;
    const elapsedSteps = Math.floor((this.accumulator + Number.EPSILON) / threshold);
    if (elapsedSteps === 0) return null;
    const delta = Math.min(elapsedSteps * threshold, 0.25);
    this.accumulator = Math.max(this.accumulator - delta, 0);
    return delta;
  }
}
