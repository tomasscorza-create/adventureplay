import { describe, expect, it } from "vitest";
import { CoopDiagnostics } from "./CoopDiagnostics";
import { CoopSecurityGuard } from "./coopSecurity";

describe("CoopDiagnostics", () => {
  it("permanece inerte mientras esta desactivado", () => {
    let now = 0;
    const diagnostics = new CoopDiagnostics(() => now);
    diagnostics.record("sent", "input", { seq: 1 }, 1);
    diagnostics.recordSnapshot(true);
    now = 1000;
    const report = diagnostics.snapshot(new CoopSecurityGuard().metrics());
    expect(report.enabled).toBe(false);
    expect(report.sent.messages).toBe(0);
    expect(report.snapshots.keyframes).toBe(0);
  });

  it("mide tasas, bytes, keyframes, deltas, latencia y uso por slot", () => {
    let now = 1000;
    const diagnostics = new CoopDiagnostics(() => now);
    diagnostics.setEnabled(true);
    diagnostics.record("sent", "input", { seq: 1, bits: 1 }, 1);
    diagnostics.record("sent", "input", { seq: 2, bits: 0 }, 2);
    diagnostics.record("received", "snapshot", { seq: 1, players: [] });
    diagnostics.recordSnapshot(true);
    diagnostics.recordSnapshot(false);
    diagnostics.recordInputApplied(12);
    diagnostics.recordInputApplied(28);
    diagnostics.recordInputSent(10, 1200);
    diagnostics.recordInputSent(11, 1300);
    diagnostics.recordInputEcho(11, 1450);
    diagnostics.recordSnapshotAge(15);
    diagnostics.recordSnapshotAge(45);
    diagnostics.recordDivergence(10);
    diagnostics.recordDivergence(50);
    diagnostics.recordCorrection("authoritative");
    diagnostics.recordDesync();
    diagnostics.recordReconnect(true);
    diagnostics.recordReconnect(false);
    now = 2000;

    const report = diagnostics.snapshot(new CoopSecurityGuard().metrics());
    expect(report.sentPerSecond).toBe(2);
    expect(report.receivedPerSecond).toBe(1);
    expect(report.byEvent.input.sent.perSlot).toEqual({ 1: 1, 2: 1 });
    expect(report.snapshots).toEqual({ keyframes: 1, deltas: 1, effectiveHz: 2 });
    expect(report.inputs).toEqual({
      applied: 2,
      averageApplyLatencyMs: 20,
      inputToEchoMs: { samples: 1, average: 150, p50: 150, p95: 150, max: 150 },
      pendingEchoes: 0,
    });
    expect(report.snapshotAgeMs).toEqual({ samples: 2, average: 30, p50: 15, p95: 45, max: 45 });
    expect(report.divergencePx).toEqual({ samples: 2, average: 30, p50: 10, p95: 50, max: 50 });
    expect(report.corrections).toEqual({ total: 1, byReason: { authoritative: 1 } });
    expect(report.desyncsDetected).toBe(1);
    expect(report.reconnects).toEqual({ successful: 1, failed: 1 });
    expect(report.sent.bytes).toBeGreaterThan(0);
  });

  it("conserva inputs pendientes hasta que un ACK los confirma", () => {
    const diagnostics = new CoopDiagnostics(() => 1000);
    diagnostics.setEnabled(true);
    diagnostics.recordInputSent(20, 100);
    diagnostics.recordInputSent(21, 200);
    diagnostics.recordInputEcho(20, 300);

    const report = diagnostics.snapshot(new CoopSecurityGuard().metrics());
    expect(report.inputs.inputToEchoMs).toEqual({
      samples: 1,
      average: 200,
      p50: 200,
      p95: 200,
      max: 200,
    });
    expect(report.inputs.pendingEchoes).toBe(1);
  });

  it("reinicia contadores al volver a activarse", () => {
    const diagnostics = new CoopDiagnostics(() => 1000);
    diagnostics.setEnabled(true);
    diagnostics.record("sent", "input", {});
    diagnostics.setEnabled(false);
    diagnostics.setEnabled(true);
    expect(diagnostics.snapshot(new CoopSecurityGuard().metrics()).sent.messages).toBe(0);
  });
});
