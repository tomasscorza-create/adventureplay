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
    });
    expect(report.desyncsDetected).toBe(1);
    expect(report.reconnects).toEqual({ successful: 1, failed: 1 });
    expect(report.sent.bytes).toBeGreaterThan(0);
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
