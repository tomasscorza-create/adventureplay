import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoopTeammateHud } from "./CoopTeammateHud";
import type { TeammateHudState } from "../../shared/types/game";

describe("CoopTeammateHud", () => {
  it("renderiza nada si no hay compañeros", () => {
    const html = renderToStaticMarkup(<CoopTeammateHud teammates={[]} />);
    expect(html).toBe("");
  });

  it("renderiza la vida y cargas de un compañero activo", () => {
    const teammates: TeammateHudState[] = [
      {
        slot: 1,
        characterId: "amy",
        health: 3,
        maxHealth: 4,
        healingCharges: 1,
        powerCharges: 5,
        status: "connected",
      },
    ];

    const html = renderToStaticMarkup(<CoopTeammateHud teammates={teammates} />);
    expect(html).toContain("P2");
    expect(html).toContain("3/4");
    expect(html).toContain("❤️ 1");
    expect(html).toContain("⚡ 5");
  });

  it("muestra estado desconectado y oculta detalles vitales", () => {
    const teammates: TeammateHudState[] = [
      {
        slot: 2,
        characterId: "ruder",
        health: 4,
        maxHealth: 4,
        healingCharges: 0,
        powerCharges: 0,
        status: "disconnected",
      },
    ];

    const html = renderToStaticMarkup(<CoopTeammateHud teammates={teammates} />);
    expect(html).toContain("P3");
    expect(html).toContain("Desconectado");
    expect(html).not.toContain("4/4");
  });

  it("muestra estado derrotado y oculta detalles vitales", () => {
    const teammates: TeammateHudState[] = [
      {
        slot: 3,
        characterId: "dunel",
        health: 0,
        maxHealth: 5,
        healingCharges: 0,
        powerCharges: 2,
        status: "defeated",
      },
    ];

    const html = renderToStaticMarkup(<CoopTeammateHud teammates={teammates} />);
    expect(html).toContain("P4");
    expect(html).toContain("Derrotado");
    expect(html).not.toContain("0/5");
  });
});
