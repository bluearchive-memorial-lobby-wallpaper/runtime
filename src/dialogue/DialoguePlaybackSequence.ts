export class DialoguePlaybackSequence {
  private nextManualIndex = 1;
  private nextAutomaticIndex: number | null = null;
  private currentIndex: number | null = null;
  private readonly dialogueCount: number;

  constructor(dialogueCount: number) {
    if (!Number.isInteger(dialogueCount) || dialogueCount < 1) {
      throw new RangeError("dialogueCount must be a positive integer");
    }
    this.dialogueCount = dialogueCount;
  }
  get nextIndex(): number { return this.nextManualIndex; }
  get automaticPlaybackActive(): boolean { return this.nextAutomaticIndex !== null; }
  start(index: number, automatic: boolean): void {
    const normalizedIndex = this.normalize(index);
    this.currentIndex = normalizedIndex;
    this.nextManualIndex = this.wrap(normalizedIndex + 1);
    this.nextAutomaticIndex = automatic && normalizedIndex < this.dialogueCount ? normalizedIndex + 1 : null;
  }
  takeAutomaticContinuation(): number | null {
    const index = this.nextAutomaticIndex;
    this.currentIndex = null;
    if (index === null) return null;
    this.start(index, true);
    return index;
  }
  setAutomaticPlaybackAfterCurrent(enabled: boolean): void {
    this.nextAutomaticIndex = enabled && this.currentIndex !== null && this.currentIndex < this.dialogueCount
      ? this.currentIndex + 1 : null;
  }
  cancelAutomaticPlayback(): void { this.nextAutomaticIndex = null; }
  stop(): void { this.currentIndex = null; this.nextAutomaticIndex = null; }
  reset(): void { this.nextManualIndex = 1; this.nextAutomaticIndex = null; this.currentIndex = null; }
  private normalize(index: number): number {
    if (!Number.isInteger(index) || index < 1 || index > this.dialogueCount) {
      throw new RangeError(`dialogue index must be between 1 and ${this.dialogueCount}`);
    }
    return index;
  }
  private wrap(index: number): number { return ((index - 1) % this.dialogueCount) + 1; }
}
