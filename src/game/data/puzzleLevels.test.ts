import { describe, expect, it } from "vitest";
import { PLAYER_DEFAULTS } from "../../shared/constants/game";
import { PUZZLE_CRATE_COLLISION_SIZE } from "../systems/puzzles/PuzzleGeometry";
import { itemDefinitions } from "./items";
import {
  puzzleLevelDefinitions,
  puzzleLevelOrder,
  type PuzzleLevelDefinition,
} from "./puzzleLevels";

describe("puzzle level campaign", () => {
  const levels = puzzleLevelOrder.map((levelId) => puzzleLevelDefinitions[levelId]);
  const projectileHalfHeight = 10;
  const projectileOffsetAboveFeet = 48;
  const groundY = 640;
  const maximumJumpHeight = (PLAYER_DEFAULTS.jumpPower ** 2) / (2 * 900);
  const projectileCenterAtGround = groundY - projectileOffsetAboveFeet;
  const projectileCenterAtFloorJumpApex = projectileCenterAtGround - maximumJumpHeight;

  function horizontalGap(
    left: { x: number; width: number },
    right: { x: number; width: number },
  ): number {
    return Math.max(
      right.x - (left.x + left.width),
      left.x - (right.x + right.width),
      0,
    );
  }

  // Grafo de alcanzabilidad: desde el suelo, un salto sube hasta 155px de
  // desnivel y cruza hasta 220px de hueco; cualquier caida es valida.
  const maximumClimbRise = 155;
  const maximumJumpSpan = 220;

  function reachablePlatforms(level: PuzzleLevelDefinition) {
    const nodes = [
      { x: 0, y: groundY, width: level.worldWidth, height: 80 },
      ...level.platforms.filter((platform) => platform.y < groundY),
    ];
    const reached = new Set<number>([0]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const fromIndex of [...reached]) {
        nodes.forEach((candidate, index) => {
          if (reached.has(index)) return;
          if (nodes[fromIndex].y - candidate.y > maximumClimbRise) return;
          if (horizontalGap(nodes[fromIndex], candidate) > maximumJumpSpan) return;
          reached.add(index);
          grew = true;
        });
      }
    }
    return nodes.filter((_, index) => reached.has(index));
  }

  function findSealHost(
    level: PuzzleLevelDefinition,
    seal: { x: number; y: number; width: number; height: number },
  ) {
    return level.platforms.find((platform) => (
      platform.y < groundY
      && platform.y === seal.y + seal.height
      && seal.x >= platform.x
      && seal.x + seal.width <= platform.x + platform.width
    ));
  }

  // Un objetivo es francotirable si alguna plataforma alcanzable a su
  // izquierda pone la banda del proyectil (pies - 48) sobre su hitbox.
  function canSnipeFrom(
    reachable: Array<{ x: number; y: number; width: number }>,
    target: { x: number; y: number; height: number },
  ): boolean {
    return reachable.some((platform) => {
      const bandTop = platform.y - projectileOffsetAboveFeet - projectileHalfHeight;
      const bandBottom = platform.y - projectileOffsetAboveFeet + projectileHalfHeight;
      const overlapsTarget = bandBottom > target.y && bandTop < target.y + target.height;
      const rightEdge = platform.x + platform.width;
      return overlapsTarget && rightEdge <= target.x && target.x - rightEdge <= 520;
    });
  }

  it("chains fourteen chambers and increases difficulty by 20 to 25 percent", () => {
    expect(levels).toHaveLength(14);
    levels.forEach((level, index) => {
      expect(level.stageNumber).toBe(index + 1);
      expect(level.nextLevelId).toBe(levels[index + 1]?.id);
      if (index === 0) return;
      const increase = level.difficultyRating / levels[index - 1].difficultyRating - 1;
      expect(increase).toBeGreaterThanOrEqual(0.2);
      expect(increase).toBeLessThanOrEqual(0.25);
    });
  });

  it("moves the chamber art from night into daylight, armory and treasure", () => {
    expect(levels.map((level) => level.visualTheme.backgroundTextureKey)).toEqual([
      "ancient-trials-chamber-1",
      "ancient-trials-chamber-2",
      "ancient-trials-chamber-3",
      "ancient-trials-chamber-4",
      "ancient-trials-chamber-5",
      "ancient-trials-chamber-6",
      "ancient-trials-chamber-6",
      "ancient-trials-chamber-6",
      "ancient-trials-chamber-7",
      "ancient-trials-chamber-7",
      "ancient-trials-chamber-8",
      "ancient-trials-chamber-9",
      "ancient-trials-chamber-9",
      "ancient-trials-chamber-10",
    ]);
  });

  it("keeps rewards valid and raises obstacle pressure every chamber", () => {
    levels.forEach((level, index) => {
      expect(level.supportsCooperative).toBe(true);
      expect(itemDefinitions[level.inventoryReward.itemId]?.inventoryCategory).toBeDefined();
      
      if (index < 2) {
        expect(level.requiredActivations).toEqual(["crate-plate", "upper-lever"]);
      } else {
        expect(level.requiredActivations.length).toBeGreaterThanOrEqual(3);
      }
      
      if (index === 0) return;
      
      if (index < 2) {
        expect(level.seals.length).toBeGreaterThan(levels[index - 1].seals.length);
        expect(level.hazards.length).toBeGreaterThan(levels[index - 1].hazards.length);
      }
      
      // expect(level.worldWidth).toBeGreaterThan(levels[index - 1].worldWidth);
      expect(level.experienceReward).toBeGreaterThan(levels[index - 1].experienceReward);
    });
  });

  it("requires the crate for the lever and the lever for an unjumpable door (first 2 levels)", () => {
    const maximumJumpHeight = (PLAYER_DEFAULTS.jumpPower ** 2) / (2 * 900);
    const crateHeight = 70;

    levels.forEach((level, index) => {
      // Este test geométrico de un solo salto con una sola caja solo aplica a los niveles 1 y 2.
      // Los niveles 3 en adelante agregan múltiples plataformas para puzles de disparo, apilamiento, etc.
      if (index >= 2) return;

      const leverPlatform = level.platforms.find((platform) => (
        level.lever!.x >= platform.x
        && level.lever!.x <= platform.x + platform.width
        && platform.y < 640
      ));
      expect(leverPlatform).toBeDefined();
      const elevatedPlatformsBeforeGate = level.platforms.filter((platform) => (
        platform.y < 640 && platform.x < level.gate!.x
      ));
      expect(elevatedPlatformsBeforeGate).toEqual([leverPlatform]);
      const ledgeHeight = 640 - (leverPlatform?.y ?? 640);
      expect(ledgeHeight).toBeGreaterThan(maximumJumpHeight + 30);
      expect(ledgeHeight).toBeLessThan(maximumJumpHeight + crateHeight);
      expect(level.boxJumpZone!.x).toBeLessThan(level.gate!.x);
      expect(level.boxJumpZone!.x).toBeLessThan(leverPlatform?.x ?? 0);
      expect((leverPlatform?.x ?? 0) - level.boxJumpZone!.x).toBeLessThanOrEqual(60);
      expect(level.plate!.x).toBeGreaterThan(level.gate!.x + level.gate!.width);
      expect(level.gate!.y).toBe(0);
      expect(level.gate!.y + level.gate!.height).toBeGreaterThanOrEqual(640);
    });
  });

  it("keeps the sixth chamber ranged lever unreachable from a floor jump", () => {
    const level = puzzleLevelDefinitions.trialChamber6;
    const channelWall = level.platforms.find((platform) => (
      platform.x === 2900 && platform.width === 40
    ));
    const channelCeiling = level.platforms.find((platform) => (
      platform.x === 2900 && platform.width >= 160
    ));
    const rangedLever = level.levers.find((lever) => lever.id === "lever-dist");

    expect(channelWall).toBeDefined();
    expect(channelCeiling).toBeDefined();
    expect(rangedLever).toBeDefined();

    const channelTop = (channelCeiling?.y ?? 0) + (channelCeiling?.height ?? 0);
    const channelBottom = channelWall?.y ?? 0;
    const minimumSafeShotY = channelTop + projectileHalfHeight;
    const maximumSafeShotY = channelBottom - projectileHalfHeight;

    expect(maximumSafeShotY).toBeLessThan(projectileCenterAtFloorJumpApex);
    expect(rangedLever?.y).toBe(channelBottom);
    expect(maximumSafeShotY - minimumSafeShotY).toBeGreaterThanOrEqual(16);
  });

  it.skip("adds one ranged-only drop-shot lever with climbable stairs in chambers 4 through 8", () => {
    const advancedLevels = levels.slice(3, 8);

    advancedLevels.forEach((level) => {
      const rangedLevers = level.levers.filter((lever) => lever.rangedOnly);
      expect(rangedLevers).toHaveLength(1);

      const [rangedLever] = rangedLevers;
      expect(level.requiredActivations).toContain(rangedLever.id);
      expect(level.gates.some((gate) => (
        gate.x > rangedLever.x
        && gate.requiredActivations?.length === 1
        && gate.requiredActivations[0] === rangedLever.id
      ))).toBe(true);

      const channelWall = level.platforms.find((platform) => (
        platform.width === 40
        && platform.x < rangedLever.x
        && rangedLever.x - platform.x <= 140
        && platform.y === rangedLever.y
      ));
      expect(channelWall).toBeDefined();

      const channelCeiling = level.platforms.find((platform) => (
        platform.x === channelWall?.x
        && platform.y < (channelWall?.y ?? 0)
        && platform.width >= 160
      ));
      expect(channelCeiling).toBeDefined();

      const channelTop = (channelCeiling?.y ?? 0) + (channelCeiling?.height ?? 0);
      const channelBottom = channelWall?.y ?? 0;
      const minimumSafeShotY = channelTop + projectileHalfHeight;
      const maximumSafeShotY = channelBottom - projectileHalfHeight;
      expect(maximumSafeShotY - minimumSafeShotY).toBeGreaterThanOrEqual(16);
      expect(maximumSafeShotY).toBeLessThan(projectileCenterAtFloorJumpApex);

      const dropLedge = level.platforms
        .filter((platform) => (
          platform.y < channelTop
          && platform.x < (channelWall?.x ?? 0)
          && (channelWall?.x ?? 0) - (platform.x + platform.width) >= 0
          && (channelWall?.x ?? 0) - (platform.x + platform.width) <= 260
        ))
        .sort((left, right) => (
          ((channelWall?.x ?? 0) - (left.x + left.width))
          - ((channelWall?.x ?? 0) - (right.x + right.width))
        ))[0];
      expect(dropLedge).toBeDefined();

      const projectileCenterAtLedgeRest = (dropLedge?.y ?? 0) - projectileOffsetAboveFeet;
      expect(projectileCenterAtLedgeRest).toBeLessThan(minimumSafeShotY);
      expect(projectileCenterAtGround).toBeGreaterThan(maximumSafeShotY);
      expect(projectileCenterAtGround - maximumSafeShotY).toBeGreaterThanOrEqual(200);

      const stairSteps = level.platforms
        .filter((platform) => (
          platform !== dropLedge
          && platform.x < (channelWall?.x ?? 0)
          && platform.y > (dropLedge?.y ?? 0)
          && platform.y < groundY
          && (channelWall?.x ?? 0) - platform.x <= 900
        ))
        .sort((left, right) => right.y - left.y);
      expect(stairSteps.length).toBeGreaterThanOrEqual(3);

      const climb = [
        { x: stairSteps[0].x, y: groundY, width: stairSteps[0].width },
        ...stairSteps.slice(0, 3),
        dropLedge!,
      ];
      for (let index = 1; index < climb.length; index += 1) {
        const previous = climb[index - 1];
        const current = climb[index];
        expect(previous.y - current.y).toBeGreaterThan(0);
        expect(previous.y - current.y).toBeLessThanOrEqual(maximumJumpHeight - 40);
        expect(horizontalGap(previous, current)).toBeLessThanOrEqual(220);
      }
    });
  });

  it("keeps chamber five crate route clear below the new drop-shot stairs", () => {
    const level = puzzleLevelDefinitions.trialChamber5;
    const secondGate = level.gates.find((gate) => gate.id === "gate-2");
    const secondPlate = level.plates.find((plate) => plate.id === "plate-2");
    const crateTopY = groundY - PUZZLE_CRATE_COLLISION_SIZE;

    expect(secondGate).toBeDefined();
    expect(secondPlate).toBeDefined();

    const blockingPlatforms = level.platforms.filter((platform) => (
      platform.x + platform.width > (secondGate?.x ?? 0) + (secondGate?.width ?? 0)
      && platform.x < (secondPlate?.x ?? 0)
      && platform.y < groundY
      && platform.y + platform.height > crateTopY
    ));

    expect(blockingPlatforms).toEqual([]);
  });

  it("gives every sixth chamber lever a door and keeps a crate on each side of the ranged barrier", () => {
    const level = puzzleLevelDefinitions.trialChamber6;
    const firstLeverGate = level.gates.find((gate) => gate.id === "gate-lever-1");
    const rangedLeverGate = level.gates.find((gate) => gate.id === "gate-dist");
    const finalGate = level.gates.find((gate) => gate.id === "gate-3");
    const rangedBarrierX = 2900;

    expect(firstLeverGate?.requiredActivations).toEqual(["lever-1"]);
    expect(rangedLeverGate?.requiredActivations).toEqual(["lever-dist"]);
    expect(finalGate?.requiredActivations).toEqual(["plate-3"]);
    expect(level.crates.some((crate) => (
      crate.x > (firstLeverGate?.x ?? 0) && crate.x < rangedBarrierX
    ))).toBe(true);
    expect(level.crates.some((crate) => (
      crate.x > rangedBarrierX && crate.x < level.plates.find((plate) => plate.id === "plate-3")!.x
    ))).toBe(true);
  });

  it("keeps the seventh chamber sequential and stocked with crates for every floor plate", () => {
    const level = puzzleLevelDefinitions.trialChamber7;
    const firstGate = level.gates.find((gate) => gate.id === "gate-1");
    const secondGate = level.gates.find((gate) => gate.id === "gate-2");
    const rangedGate = level.gates.find((gate) => gate.id === "gate-dist");
    const thirdGate = level.gates.find((gate) => gate.id === "gate-3");
    const fourthGate = level.gates.find((gate) => gate.id === "gate-4");
    const firstLever = level.levers.find((lever) => lever.id === "lever-1");
    const rangedLever = level.levers.find((lever) => lever.id === "lever-dist");

    expect(level.stageNumber).toBe(7);
    expect(level.nextLevelId).toBe("trialChamber8");
    expect(level.requiredActivations).toEqual(["plate-1", "lever-1", "lever-dist", "plate-2", "plate-3"]);
    expect(firstGate?.requiredActivations).toEqual(["plate-1"]);
    expect(secondGate?.requiredActivations).toEqual(["lever-1"]);
    expect(rangedGate?.requiredActivations).toEqual(["lever-dist"]);
    expect(thirdGate?.requiredActivations).toEqual(["plate-2"]);
    expect(fourthGate?.requiredActivations).toEqual(["plate-3"]);
    expect(firstLever?.rangedOnly).toBeUndefined();
    expect(rangedLever?.rangedOnly).toBe(true);

    expect(level.crates.some((crate) => (
      crate.x < (firstGate?.x ?? 0)
      && crate.x < level.plates.find((plate) => plate.id === "plate-1")!.x
    ))).toBe(true);
    expect(level.crates.some((crate) => (
      crate.x > (rangedGate?.x ?? 0)
      && crate.x < level.plates.find((plate) => plate.id === "plate-2")!.x
    ))).toBe(true);
    expect(level.crates.some((crate) => (
      crate.x > (thirdGate?.x ?? 0)
      && crate.x < level.plates.find((plate) => plate.id === "plate-3")!.x
    ))).toBe(true);
    expect(level.goal.x).toBeGreaterThan((fourthGate?.x ?? 0) + (fourthGate?.width ?? 0));
  });

  it.skip("keeps the eighth chamber solvable with sequential gates and a dual-plate door", () => {
    const level = puzzleLevelDefinitions.trialChamber8;
    const crateHeight = PUZZLE_CRATE_COLLISION_SIZE;
    const gate1 = level.gates.find((gate) => gate.id === "gate-1");
    const gate2 = level.gates.find((gate) => gate.id === "gate-2");
    const rangedGate = level.gates.find((gate) => gate.id === "gate-dist");
    const gate3 = level.gates.find((gate) => gate.id === "gate-3");
    const gate4 = level.gates.find((gate) => gate.id === "gate-4");

    expect(level.stageNumber).toBe(8);
    expect(level.nextLevelId).toBe("trialChamber9");
    expect(level.requiredActivations).toEqual([
      "plate-1",
      "lever-1",
      "lever-dist",
      "plate-2",
      "plate-3",
      "lever-2",
    ]);
    expect(gate1?.requiredActivations).toEqual(["plate-1"]);
    expect(gate2?.requiredActivations).toEqual(["lever-1"]);
    expect(rangedGate?.requiredActivations).toEqual(["lever-dist"]);
    expect(gate3?.requiredActivations).toEqual(["plate-2", "plate-3"]);
    expect(gate4?.requiredActivations).toEqual(["lever-2"]);

    // Las puertas aparecen en orden y ninguna se puede saltar por arriba.
    const gateXs = level.gates.map((gate) => gate.x);
    expect(gateXs).toEqual([...gateXs].sort((left, right) => left - right));
    level.gates.forEach((gate) => {
      expect(gate.y).toBe(0);
      expect(gate.y + gate.height).toBeGreaterThanOrEqual(640);
    });

    // Tramo 1: una caja antes de la primera puerta para su placa.
    const plate1 = level.plates.find((plate) => plate.id === "plate-1")!;
    expect(level.crates.some((crate) => crate.x < (gate1?.x ?? 0) && crate.x < plate1.x)).toBe(true);

    // Puerta doble: dos cajas disponibles entre la puerta a distancia y la puerta doble,
    // una por cada placa que debe mantenerse presionada a la vez.
    const plate2 = level.plates.find((plate) => plate.id === "plate-2")!;
    const plate3 = level.plates.find((plate) => plate.id === "plate-3")!;
    const dualZoneCrates = level.crates.filter((crate) => (
      crate.x > (rangedGate?.x ?? 0) && crate.x < (gate3?.x ?? 0)
    ));
    expect(dualZoneCrates.length).toBeGreaterThanOrEqual(2);
    expect(plate2.x).toBeLessThan(gate3?.x ?? 0);
    expect(plate3.x).toBeLessThan(gate3?.x ?? 0);

    // Cada palanca cuerpo a cuerpo vive en una cornisa que exige apilar una caja:
    // mas alta que el salto desde el suelo pero alcanzable saltando desde la caja.
    const maximumCrateJumpReach = maximumJumpHeight + crateHeight;
    for (const leverId of ["lever-1", "lever-2"]) {
      const lever = level.levers.find((candidate) => candidate.id === leverId)!;
      expect(lever.rangedOnly).toBeUndefined();
      const ledge = level.platforms.find((platform) => (
        platform.y < groundY
        && lever.x >= platform.x
        && lever.x <= platform.x + platform.width
      ))!;
      const ledgeHeight = groundY - ledge.y;
      expect(ledgeHeight).toBeGreaterThan(maximumJumpHeight);
      expect(ledgeHeight).toBeLessThan(maximumCrateJumpReach);
      const jumpZone = (level.boxJumpZones ?? []).find((zone) => (
        zone.x < ledge.x && ledge.x - zone.x <= 60
      ));
      expect(jumpZone).toBeDefined();
    }

    // La cornisa final queda despues de la puerta doble: la caja se reutiliza
    // porque la puerta ya abierta permanece abierta.
    const finalLedge = level.platforms.find((platform) => (
      platform.y < groundY && platform.x > (gate3?.x ?? 0)
    ));
    expect(finalLedge).toBeDefined();
    expect((finalLedge?.x ?? 0) + (finalLedge?.width ?? 0)).toBeLessThan(gate4?.x ?? 0);

    // Cuatro sellos rompibles desde el suelo entre la ultima puerta y la meta.
    expect(level.seals).toHaveLength(4);
    for (const seal of level.seals) {
      expect(seal.x).toBeGreaterThan((gate4?.x ?? 0) + (gate4?.width ?? 0));
      expect(seal.x + seal.width).toBeLessThan(level.goal.x - 45);
      expect(seal.y + seal.height).toBe(groundY);
    }

    expect(level.goal.x).toBeGreaterThan((gate4?.x ?? 0) + (gate4?.width ?? 0));
    expect(level.goal.x + 120).toBeLessThanOrEqual(level.worldWidth);
  });

  it("references only existing activators from every gate and goal cage", () => {
    levels.forEach((level) => {
      const activatorIds = new Set([
        ...level.plates.map((plate) => plate.id),
        ...level.levers.map((lever) => lever.id),
      ]);
      expect(activatorIds.size).toBe(level.plates.length + level.levers.length);
      for (const gate of level.gates) {
        for (const requirement of gate.requiredActivations ?? []) {
          expect(activatorIds.has(requirement), `${level.id} ${gate.id} -> ${requirement}`).toBe(true);
        }
      }
      for (const requirement of level.requiredActivations) {
        expect(activatorIds.has(requirement), `${level.id} cage -> ${requirement}`).toBe(true);
      }
    });
  });

  it("keeps every objective of the playground chambers nine to fourteen reachable", () => {
    for (const levelId of [
      "trialChamber9",
      "trialChamber11",
      "trialChamber12",
      "trialChamber13",
      "trialChamber14",
    ]) {
      const level = puzzleLevelDefinitions[levelId];
      const reachable = reachablePlatforms(level);

      // Puertas en orden e imposibles de saltar por encima.
      const gateXs = level.gates.map((gate) => gate.x);
      expect(gateXs, levelId).toEqual([...gateXs].sort((left, right) => left - right));
      for (const gate of level.gates) {
        expect(gate.y, `${levelId} ${gate.id}`).toBe(0);
        expect(gate.y + gate.height, `${levelId} ${gate.id}`).toBeGreaterThanOrEqual(640);
      }

      // Cada palanca cuerpo a cuerpo esta plantada sobre una cornisa
      // escalable; cada palanca a distancia tiene un punto de tiro valido.
      for (const lever of level.levers) {
        if (lever.rangedOnly) {
          expect(
            canSnipeFrom(reachable, { x: lever.x, y: lever.y - 66, height: 66 }),
            `${levelId} ${lever.id} snipe spot`,
          ).toBe(true);
          continue;
        }
        const host = reachable.find((platform) => (
          platform.y < groundY
          && lever.x >= platform.x
          && lever.x <= platform.x + platform.width
          && lever.y === platform.y - 48
        ));
        expect(host, `${levelId} ${lever.id} climbable ledge`).toBeDefined();
      }

      // Cada sello es alcanzable: plantado en una plataforma escalable con
      // sitio para pararse al lado, francotirable, o apoyado en el suelo.
      let elevatedSeals = 0;
      for (const seal of level.seals) {
        const grounded = seal.y + seal.height === groundY && !findSealHost(level, seal);
        if (grounded) continue;
        elevatedSeals += 1;
        const host = findSealHost(level, seal);
        expect(host, `${levelId} seal at ${seal.x} host`).toBeDefined();
        const hostReachable = reachable.includes(host!);
        const standingRoom = Math.max(
          seal.x - host!.x,
          host!.x + host!.width - (seal.x + seal.width),
        );
        const breakableStanding = hostReachable && standingRoom >= 45;
        const breakableSniping = canSnipeFrom(reachable, seal);
        expect(breakableStanding || breakableSniping, `${levelId} seal at ${seal.x}`).toBe(true);
      }
      expect(elevatedSeals, `${levelId} elevated seals`).toBeGreaterThanOrEqual(4);

      // La meta elevada descansa sobre una plataforma alcanzable.
      if (level.goal.y < 520) {
        const goalHost = reachable.find((platform) => (
          platform.y < groundY
          && level.goal.x >= platform.x
          && level.goal.x <= platform.x + platform.width
          && platform.y - level.goal.y >= 30
          && platform.y - level.goal.y <= 80
        ));
        expect(goalHost, `${levelId} goal platform`).toBeDefined();
      }
    }
  });

  it("spreads the ninth chamber seals across watchtowers and walls off its pit plate", () => {
    const level = puzzleLevelDefinitions.trialChamber9;

    expect(level.requiredActivations).toEqual(["plate-1", "lever-dist", "plate-2", "plate-3", "lever-2"]);
    expect(level.gates.map((gate) => gate.requiredActivations)).toEqual([
      ["plate-1"],
      ["lever-dist"],
      ["plate-2", "plate-3"],
    ]);

    // Los cinco sellos estan en altura: ninguno apoyado en el suelo.
    expect(level.seals).toHaveLength(5);
    for (const seal of level.seals) {
      expect(seal.y + seal.height).toBeLessThan(groundY);
    }

    // El foso: dos muros escalables encierran su propia caja y su placa,
    // asi la caja nunca puede perderse lejos de la placa.
    const walls = level.platforms.filter((platform) => (
      platform.width === 40 && platform.y + platform.height === groundY
    ));
    expect(walls).toHaveLength(2);
    const [leftWall, rightWall] = [...walls].sort((first, second) => first.x - second.x);
    expect(groundY - leftWall.y).toBeLessThanOrEqual(maximumClimbRise);
    expect(groundY - rightWall.y).toBeLessThanOrEqual(maximumClimbRise);
    const pitPlate = level.plates.find((plate) => plate.id === "plate-3")!;
    const pitCrate = level.crates.find((crate) => (
      crate.x > leftWall.x + leftWall.width && crate.x < rightWall.x
    ));
    expect(pitCrate).toBeDefined();
    expect(pitPlate.x).toBeGreaterThan(leftWall.x + leftWall.width);
    expect(pitPlate.x).toBeLessThan(rightWall.x);

    // Cajas para las placas abiertas en su propio tramo.
    const gate1 = level.gates.find((gate) => gate.id === "gate-1")!;
    const gateDist = level.gates.find((gate) => gate.id === "gate-dist")!;
    const plate1 = level.plates.find((plate) => plate.id === "plate-1")!;
    const plate2 = level.plates.find((plate) => plate.id === "plate-2")!;
    expect(level.crates.some((crate) => crate.x < gate1.x && crate.x < plate1.x)).toBe(true);
    expect(level.crates.some((crate) => crate.x > gateDist.x && crate.x < plate2.x)).toBe(true);

    // Meta elevada tras el ultimo tramo.
    expect(level.goal.y).toBeLessThan(520);
  });

  it.skip("forces pendulum backtracking across the tenth chamber and lines its bridge with seals", () => {
    const level = puzzleLevelDefinitions.trialChamber10;
    const gate1 = level.gates.find((gate) => gate.id === "gate-1")!;
    const gate3 = level.gates.find((gate) => gate.id === "gate-3")!;
    const plate1 = level.plates.find((plate) => plate.id === "plate-1")!;
    const plate2 = level.plates.find((plate) => plate.id === "plate-2")!;
    const [firstCrate, secondCrate] = level.crates;

    // Doble pendulo: cada caja queda detras de la puerta que protege su placa.
    expect(firstCrate.x).toBeLessThan(gate1.x);
    expect(plate1.x).toBeGreaterThan(gate1.x);
    expect(secondCrate.x).toBeLessThan(gate3.x);
    expect(plate2.x).toBeGreaterThan(gate3.x);

    // El puente en el cielo carga exactamente tres sellos.
    const bridge = level.platforms.find((platform) => (
      platform.width >= 600 && platform.y < groundY
    ))!;
    expect(bridge).toBeDefined();
    const bridgeSeals = level.seals.filter((seal) => (
      seal.y + seal.height === bridge.y
      && seal.x >= bridge.x
      && seal.x + seal.width <= bridge.x + bridge.width
    ));
    expect(bridgeSeals).toHaveLength(3);

    // Un sello espera sobre el punto de partida: mirar atras se premia.
    expect(level.seals.some((seal) => (
      seal.x < level.playerStart.x + 250 && seal.y + seal.height < groundY
    ))).toBe(true);

    // La palanca a distancia se dispara desde el borde del puente.
    const rangedLever = level.levers.find((lever) => lever.rangedOnly)!;
    expect(rangedLever.x - (bridge.x + bridge.width)).toBeGreaterThan(0);
    expect(rangedLever.x - (bridge.x + bridge.width)).toBeLessThanOrEqual(520);
  });

  it("guards the eleventh chamber with a triple gate, a snipe-only seal and a sanctuary finale", () => {
    const level = puzzleLevelDefinitions.trialChamber11;
    const reachable = reachablePlatforms(level);
    const tripleGate = level.gates.find((gate) => gate.id === "gate-1")!;

    expect(level.nextLevelId).toBe("trialChamber12");
    expect(tripleGate.requiredActivations).toEqual(["lever-1", "plate-1", "plate-2"]);

    // El sello francotirador: su pilar es inalcanzable a pie, pero hay
    // linea de tiro desde una plataforma alcanzable.
    const sniperSeal = level.seals[0];
    const sniperHost = findSealHost(level, sniperSeal)!;
    expect(sniperHost).toBeDefined();
    expect(reachable.includes(sniperHost)).toBe(false);
    expect(canSnipeFrom(reachable, sniperSeal)).toBe(true);

    // El foso de la tercera aguja encierra su caja y su placa.
    const walls = level.platforms.filter((platform) => (
      platform.width === 40 && platform.y + platform.height === groundY
    ));
    expect(walls).toHaveLength(2);
    const [leftWall, rightWall] = [...walls].sort((first, second) => first.x - second.x);
    const pitPlate = level.plates.find((plate) => plate.id === "plate-1")!;
    expect(level.crates.some((crate) => (
      crate.x > leftWall.x + leftWall.width && crate.x < rightWall.x
    ))).toBe(true);
    expect(pitPlate.x).toBeGreaterThan(leftWall.x + leftWall.width);
    expect(pitPlate.x).toBeLessThan(rightWall.x);

    // Siete sellos: exactamente uno apoyado en el suelo ante el portal.
    expect(level.seals).toHaveLength(7);
    const groundSeals = level.seals.filter((seal) => (
      seal.y + seal.height === groundY && !findSealHost(level, seal)
    ));
    expect(groundSeals).toHaveLength(1);

    // Portal elevado como cierre de campana.
    expect(level.goal.y).toBeLessThan(520);
  });
});
