import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SaveSyncStatus } from "./SaveSyncStatus";

describe("SaveSyncStatus", () => {
  it("renders nothing while disconnected", () => {
    const html = renderToStaticMarkup(
      <SaveSyncStatus state="disconnected" onRetry={vi.fn()} />,
    );
    expect(html).toBe("");
  });

  it("announces pending progress without exposing a retry action", () => {
    const html = renderToStaticMarkup(
      <SaveSyncStatus state="pending" onRetry={vi.fn()} />,
    );
    expect(html).toContain("Guardando progreso");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Reintentar");
  });

  it("hides routine updates in quiet gameplay mode", () => {
    const html = renderToStaticMarkup(
      <SaveSyncStatus state="pending" quiet onRetry={vi.fn()} />,
    );
    expect(html).toBe("");
  });

  it("keeps synchronization errors visible with an explicit retry action", () => {
    const html = renderToStaticMarkup(
      <SaveSyncStatus
        state="error"
        error="No se pudo sincronizar el progreso."
        quiet
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain("No se pudo sincronizar el progreso.");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
  });
});
