import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpinCooldownIndicator } from "./SpinCooldownIndicator";

describe("SpinCooldownIndicator", () => {
  it("stays hidden when the attack is ready", () => {
    expect(renderToStaticMarkup(<SpinCooldownIndicator remainingMs={0} />)).toBe("");
  });

  it("shows seconds and radial progress while recharging", () => {
    const html = renderToStaticMarkup(<SpinCooldownIndicator remainingMs={4500} />);
    expect(html).toContain("spin-cooldown");
    expect(html).toContain(">5<");
    expect(html).toContain("90deg");
  });
});
