import type { PuzzleActivationId } from "../../data/puzzleLevels";

export class PuzzleActivationSystem {
  private requiredActivations = new Set<PuzzleActivationId>();
  private readonly participantsByActivation = new Map<PuzzleActivationId, Set<string>>();

  reset(requiredActivations: readonly PuzzleActivationId[]): void {
    this.requiredActivations = new Set(requiredActivations);
    this.participantsByActivation.clear();
  }

  setParticipantActive(
    activationId: PuzzleActivationId,
    participantId: string,
    active: boolean,
  ): boolean {
    if (!this.requiredActivations.has(activationId)) return false;
    const participants = this.participantsByActivation.get(activationId) ?? new Set<string>();
    const wasActive = participants.size > 0;
    if (active) participants.add(participantId);
    else participants.delete(participantId);
    if (participants.size > 0) this.participantsByActivation.set(activationId, participants);
    else this.participantsByActivation.delete(activationId);
    return wasActive !== (participants.size > 0);
  }

  isActive(activationId: PuzzleActivationId): boolean {
    return (this.participantsByActivation.get(activationId)?.size ?? 0) > 0;
  }

  isComplete(): boolean {
    return [...this.requiredActivations].every((activationId) => this.isActive(activationId));
  }
}
