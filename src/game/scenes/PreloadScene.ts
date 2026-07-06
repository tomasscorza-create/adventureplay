import Phaser from "phaser";
import { faustAnimationRanges } from "../data/faustAnimation";
import { loadSceneAssets } from "./preload/loadSceneAssets";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    loadSceneAssets(this);
  }

  create(): void {
    this.createCharacterAnimations();
    this.createEnchantedM2Frames();
    this.createVolcanicM2Frames();
    this.createM2Animations();
    this.createM3Animations();
    this.createEnchantedM3Animations();
    this.createVolcanicM3Animations();
    this.createEnemyTexture();
    this.createM1Texture();
    this.createEnchantedM0Texture();
    this.createEnchantedM1Texture();
    this.createVolcanicM0Texture();
    this.createVolcanicM1Texture();
    this.createPowerProjectileTexture();
    this.createCoinTexture();
    this.createInventoryPieceTexture();
    this.createRewardBoxTexture();
    this.createHealthHeartTexture();
    this.createSawTexture();
    this.createCheckpointTexture();
    this.createGoalTexture();
    this.scene.start("MainMenuScene");
  }


  private createCharacterAnimations(): void {
    this.createPoseSheetTexture("character-amy", "character-source-amy");
    this.createPoseSheetTexture("character-dunel", "character-source-dunel");
    this.createPoseSheetTexture("character-sarix", "character-source-sarix");

    for (const textureKey of ["character-ruder", "character-amy", "character-dunel", "character-sarix"]) {
      this.createPlayerAnimations(textureKey);
    }
    this.createFaustAnimations();
  }

  private createFaustAnimations(): void {
    for (const [state, range] of Object.entries(faustAnimationRanges)) {
      this.anims.create({
        key: `character-faust-${state}`,
        frames: this.anims.generateFrameNumbers("character-faust", {
          start: range.start,
          end: range.end,
        }),
        frameRate: range.frameRate,
        repeat: range.repeat,
      });
    }
  }

  private createPlayerAnimations(textureKey: string): void {
    this.anims.create({
      key: `${textureKey}-idle`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 3 }),
      frameRate: 5,
      repeat: -1,
    });

    this.anims.create({
      key: `${textureKey}-run`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 4, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: `${textureKey}-jump`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 9, end: 12 }),
      frameRate: 8,
      repeat: 0,
    });

    this.anims.create({
      key: `${textureKey}-fall`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 13, end: 16 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: `${textureKey}-attack`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 17, end: 20 }),
      frameRate: 13,
      repeat: 0,
    });

    this.anims.create({
      key: `${textureKey}-hurt`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 21, end: 24 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: `${textureKey}-dead`,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 25, end: 28 }),
      frameRate: 7,
      repeat: 0,
    });
  }

  private createPoseSheetTexture(textureKey: string, sourceKey: string): void {
    const frameWidth = 96;
    const frameHeight = 80;
    const frameSequence = [
      "idle",
      "idle",
      "idle",
      "idle",
      "walk",
      "run",
      "walk",
      "run",
      "run",
      "jump",
      "jump",
      "jump",
      "jump",
      "land",
      "land",
      "land",
      "land",
      "attack",
      "attack",
      "attack",
      "attack",
      "hurt",
      "hurt",
      "hurt",
      "hurt",
      "die",
      "die",
      "die",
      "die",
    ];
    const poseCells: Record<string, { col: number; row: number }> = {
      idle: { col: 0, row: 0 },
      walk: { col: 1, row: 0 },
      run: { col: 2, row: 0 },
      attack: { col: 0, row: 1 },
      hurt: { col: 2, row: 1 },
      jump: { col: 0, row: 2 },
      land: { col: 1, row: 2 },
      die: { col: 2, row: 2 },
    };
    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    const sourceWidth = sourceImage.width;
    const sourceHeight = sourceImage.height;
    const cellWidth = sourceWidth / 3;
    const cellHeight = sourceHeight / 3;
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth * frameSequence.length;
    canvas.height = frameHeight;
    const context = canvas.getContext("2d");
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d", { willReadFrequently: true });

    if (!context || !measureContext) {
      return;
    }

    for (const [frameIndex, poseName] of frameSequence.entries()) {
      const cell = poseCells[poseName];
      const labelCrop = Math.floor(cellHeight * 0.18);
      const sourceX = Math.floor(cell.col * cellWidth);
      const sourceY = Math.floor(cell.row * cellHeight + labelCrop);
      const cropWidth = Math.floor(cellWidth);
      const cropHeight = Math.floor(cellHeight - labelCrop);
      const bounds = this.findVisibleBounds(sourceImage, measureCanvas, measureContext, {
        x: sourceX,
        y: sourceY,
        width: cropWidth,
        height: cropHeight,
      });
      const paddedBounds = {
        x: Math.max(sourceX, bounds.x - 8),
        y: Math.max(sourceY, bounds.y - 8),
        width: Math.min(sourceX + cropWidth, bounds.x + bounds.width + 8) - Math.max(sourceX, bounds.x - 8),
        height: Math.min(sourceY + cropHeight, bounds.y + bounds.height + 8) - Math.max(sourceY, bounds.y - 8),
      };
      const scale = Math.min(frameWidth / paddedBounds.width, frameHeight / paddedBounds.height, 1.8);
      const drawWidth = paddedBounds.width * scale;
      const drawHeight = paddedBounds.height * scale;
      const drawX = frameIndex * frameWidth + (frameWidth - drawWidth) / 2;
      const drawY = frameHeight - drawHeight + 2;

      context.drawImage(
        sourceImage,
        paddedBounds.x,
        paddedBounds.y,
        paddedBounds.width,
        paddedBounds.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }

    const texture = this.textures.addCanvas(textureKey, canvas);
    if (!texture) {
      return;
    }

    for (let frameIndex = 0; frameIndex < frameSequence.length; frameIndex += 1) {
      texture.add(frameIndex, 0, frameIndex * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private findVisibleBounds(
    sourceImage: HTMLImageElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    area: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number; width: number; height: number } {
    canvas.width = area.width;
    canvas.height = area.height;
    context.clearRect(0, 0, area.width, area.height);
    context.drawImage(sourceImage, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

    const pixels = context.getImageData(0, 0, area.width, area.height).data;
    let minX = area.width;
    let minY = area.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < area.height; y += 1) {
      for (let x = 0; x < area.width; x += 1) {
        const alpha = pixels[(y * area.width + x) * 4 + 3];
        if (alpha > 8) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      return area;
    }

    return {
      x: area.x + minX,
      y: area.y + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  private createM2Animations(): void {
    this.anims.create({
      key: "enemy-m2-fly",
      frames: this.anims.generateFrameNumbers("enemy-m2", { start: 0, end: 3 }),
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m2-flight",
      frames: [1, 2, 3].map((frame) => ({ key: `enchanted-m2-frame-${frame}` })),
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m2-windup",
      frames: [4, 5, 6, 7].map((frame) => ({ key: `enchanted-m2-frame-${frame}` })),
      frameRate: 11,
      repeat: 0,
    });
    this.anims.create({
      key: "enchanted-m2-dive",
      frames: [{ key: "enchanted-m2-frame-7" }],
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m2-recover",
      frames: [8, 5, 4].map((frame) => ({ key: `enchanted-m2-frame-${frame}` })),
      frameRate: 7,
      repeat: 0,
    });
    this.anims.create({
      key: "enchanted-m2-defeat",
      frames: [9, 10].map((frame) => ({ key: `enchanted-m2-frame-${frame}` })),
      frameRate: 6,
      repeat: 0,
    });
    this.anims.create({
      key: "volcanic-m2-flight",
      frames: Array.from({ length: 11 }, (_, index) => ({
        key: `volcanic-m2-flight-${index + 1}`,
      })),
      frameRate: 11,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m2-windup",
      frames: [1, 2].map((frame) => ({ key: `volcanic-m2-attack-${frame}` })),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: "volcanic-m2-dive",
      frames: [3, 4].map((frame) => ({ key: `volcanic-m2-attack-${frame}` })),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m2-recover",
      frames: [8, 7].map((frame) => ({ key: `volcanic-m2-attack-${frame}` })),
      frameRate: 7,
      repeat: 0,
    });
    this.anims.create({
      key: "volcanic-m2-defeat",
      frames: [5, 6].map((frame) => ({ key: `volcanic-m2-attack-${frame}` })),
      frameRate: 6,
      repeat: 0,
    });
  }

  private createEnchantedM2Frames(): void {
    const sourceCrops = [
      { x: 0, y: 0, width: 347, height: 320 },
      { x: 0, y: 0, width: 347, height: 320 },
      { x: 0, y: 0, width: 347, height: 320 },
      { x: 0, y: 0, width: 286, height: 325 },
      { x: 0, y: 0, width: 252, height: 325 },
      { x: 0, y: 0, width: 286, height: 325 },
      { x: 48, y: 0, width: 238, height: 325 },
      { x: 0, y: 0, width: 286, height: 325 },
      { x: 0, y: 0, width: 286, height: 325 },
      { x: 0, y: 0, width: 286, height: 325 },
    ];

    sourceCrops.forEach((crop, index) => {
      this.createNormalizedM2Frame(
        `enchanted-m2-frame-${index + 1}`,
        `enchanted-m2-source-${index + 1}`,
        crop,
      );
    });
  }

  private createVolcanicM2Frames(): void {
    const flightCrops = [
      { x: 95, y: 175, width: 270, height: 220 },
      { x: 365, y: 175, width: 300, height: 220 },
      { x: 650, y: 175, width: 360, height: 220 },
      { x: 0, y: 325, width: 250, height: 260 },
      { x: 245, y: 325, width: 255, height: 260 },
      { x: 495, y: 325, width: 255, height: 260 },
      { x: 745, y: 325, width: 279, height: 260 },
      { x: 0, y: 595, width: 250, height: 210 },
      { x: 245, y: 595, width: 255, height: 210 },
      { x: 495, y: 595, width: 255, height: 210 },
      { x: 745, y: 595, width: 279, height: 210 },
    ];
    flightCrops.forEach((crop, index) => {
      this.createNormalizedVolcanicM2Frame(
        `volcanic-m2-flight-${index + 1}`,
        "volcanic-m2-flight-source",
        crop,
      );
    });

    const attackCrops = [
      { x: 0, y: 220, width: 256, height: 310, clear: { x: 4, y: 22, width: 38, height: 38 } },
      { x: 256, y: 220, width: 244, height: 310, clear: { x: 20, y: 22, width: 38, height: 38 } },
      { x: 500, y: 220, width: 244, height: 310, clear: { x: 0, y: 22, width: 38, height: 38 } },
      { x: 744, y: 220, width: 280, height: 310, clear: { x: 0, y: 22, width: 38, height: 38 } },
      { x: 0, y: 520, width: 256, height: 290, clear: { x: 4, y: 18, width: 38, height: 38 } },
      { x: 256, y: 520, width: 244, height: 290, clear: { x: 20, y: 18, width: 38, height: 38 } },
      { x: 500, y: 520, width: 244, height: 290, clear: { x: 0, y: 18, width: 38, height: 38 } },
      { x: 744, y: 520, width: 280, height: 290, clear: { x: 0, y: 18, width: 38, height: 38 } },
    ];
    attackCrops.forEach(({ clear, ...crop }, index) => {
      this.createNormalizedVolcanicM2Frame(
        `volcanic-m2-attack-${index + 1}`,
        "volcanic-m2-attack-source",
        crop,
        clear,
      );
    });
  }

  private createNormalizedVolcanicM2Frame(
    textureKey: string,
    sourceKey: string,
    crop: { x: number; y: number; width: number; height: number },
    clear?: { x: number; y: number; width: number; height: number },
  ): void {
    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    const scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = crop.width;
    scratchCanvas.height = crop.height;
    const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = 320;
    frameCanvas.height = 320;
    const frameContext = frameCanvas.getContext("2d");
    if (!scratchContext || !frameContext) {
      return;
    }

    scratchContext.drawImage(
      sourceImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    if (clear) {
      scratchContext.clearRect(clear.x, clear.y, clear.width, clear.height);
    }
    const bounds = this.findCanvasVisibleBounds(scratchContext, crop.width, crop.height);
    const padding = 16;
    const scale = Math.min(
      (320 - padding * 2) / bounds.width,
      (320 - padding * 2) / bounds.height,
    );
    const drawWidth = bounds.width * scale;
    const drawHeight = bounds.height * scale;
    frameContext.drawImage(
      scratchCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      (320 - drawWidth) / 2,
      (320 - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    this.textures.addCanvas(textureKey, frameCanvas);
  }

  private findCanvasVisibleBounds(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): { x: number; y: number; width: number; height: number } {
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3] > 8) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    return minX <= maxX && minY <= maxY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : { x: 0, y: 0, width, height };
  }

  private createNormalizedM2Frame(
    textureKey: string,
    sourceKey: string,
    crop: { x: number; y: number; width: number; height: number },
  ): void {
    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    const scratchCanvas = document.createElement("canvas");
    const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
    const frameCanvas = document.createElement("canvas");
    const frameContext = frameCanvas.getContext("2d");
    if (!scratchContext || !frameContext) {
      return;
    }

    const frameSize = 320;
    const padding = 18;
    frameCanvas.width = frameSize;
    frameCanvas.height = frameSize;
    const bounds = this.findVisibleBounds(sourceImage, scratchCanvas, scratchContext, crop);
    const scale = Math.min(
      (frameSize - padding * 2) / bounds.width,
      (frameSize - padding * 2) / bounds.height,
    );
    const drawWidth = bounds.width * scale;
    const drawHeight = bounds.height * scale;
    const drawX = (frameSize - drawWidth) / 2;
    const drawY = (frameSize - drawHeight) / 2;
    frameContext.drawImage(
      sourceImage,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );
    this.textures.addCanvas(textureKey, frameCanvas);
  }

  private createM3Animations(): void {
    this.anims.create({
      key: "enemy-m3-run",
      frames: [1, 2, 3, 4, 5].map((frameNumber) => ({
        key: `enemy-m3-run-${frameNumber}`,
      })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "enemy-m3-alert",
      frames: [1, 2].map((frameNumber) => ({ key: `enemy-m3-run-${frameNumber}` })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "enemy-m3-attack-windup",
      frames: [2, 1, 2].map((frameNumber) => ({ key: `enemy-m3-run-${frameNumber}` })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "enemy-m3-attack",
      frames: [3, 4, 5].map((frameNumber) => ({ key: `enemy-m3-run-${frameNumber}` })),
      frameRate: 15,
      repeat: -1,
    });
    this.anims.create({
      key: "enemy-m3-hurt",
      frames: [5, 2].map((frameNumber) => ({ key: `enemy-m3-run-${frameNumber}` })),
      frameRate: 14,
      repeat: 0,
    });
    this.anims.create({
      key: "enemy-m3-defeat",
      frames: [5, 4, 2, 1].map((frameNumber) => ({ key: `enemy-m3-run-${frameNumber}` })),
      frameRate: 12,
      repeat: 0,
    });
  }

  private createEnchantedM3Animations(): void {
    this.anims.create({
      key: "enchanted-m3-idle",
      frames: ["enchanted-m3-idle", "enchanted-m3-run-1"].map((key) => ({ key })),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m3-alert",
      frames: ["enchanted-m3-idle", "enchanted-m3-attack-1"].map((key) => ({ key })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m3-run",
      frames: ["enchanted-m3-run-1", "enchanted-m3-run-2"].map((key) => ({ key })),
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m3-attack-windup",
      frames: [
        "enchanted-m3-attack-1",
        "enchanted-m3-idle",
        "enchanted-m3-attack-1",
      ].map((key) => ({ key })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m3-attack",
      frames: ["enchanted-m3-attack-1", "enchanted-m3-attack-2"].map((key) => ({ key })),
      frameRate: 13,
      repeat: -1,
    });
    this.anims.create({
      key: "enchanted-m3-hurt",
      frames: ["enchanted-m3-attack-1", "enchanted-m3-run-1"].map((key) => ({ key })),
      frameRate: 13,
      repeat: 0,
    });
    this.anims.create({
      key: "enchanted-m3-defeat",
      frames: ["enchanted-m3-defeat-1", "enchanted-m3-defeat-2"].map((key) => ({ key })),
      frameRate: 6,
      repeat: 0,
    });
  }

  private createVolcanicM3Animations(): void {
    this.anims.create({
      key: "volcanic-m3-idle",
      frames: ["volcanic-m3-idle", "volcanic-m3-run-1"].map((key) => ({ key })),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m3-alert",
      frames: ["volcanic-m3-idle", "volcanic-m3-alert"].map((key) => ({ key })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m3-run",
      frames: ["volcanic-m3-run-1", "volcanic-m3-run-2"].map((key) => ({ key })),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m3-attack-windup",
      frames: ["volcanic-m3-alert", "volcanic-m3-attack-windup"].map((key) => ({ key })),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m3-attack",
      frames: ["volcanic-m3-attack-windup", "volcanic-m3-attack"].map((key) => ({ key })),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: "volcanic-m3-hurt",
      frames: ["volcanic-m3-defeat", "volcanic-m3-idle"].map((key) => ({ key })),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: "volcanic-m3-defeat",
      frames: ["volcanic-m3-attack", "volcanic-m3-defeat"].map((key) => ({ key })),
      frameRate: 6,
      repeat: 0,
    });
  }

  private createEnemyTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0d1512, 0.32);
    graphics.fillEllipse(21, 38, 30, 8);
    graphics.fillStyle(0x5b1d21, 1);
    graphics.fillRoundedRect(5, 9, 32, 27, 10);
    graphics.fillStyle(0xe8564f, 1);
    graphics.fillRoundedRect(9, 12, 24, 20, 8);
    graphics.fillStyle(0xffc46a, 1);
    graphics.fillTriangle(9, 10, 14, 1, 19, 12);
    graphics.fillTriangle(25, 10, 31, 1, 34, 13);
    graphics.fillStyle(0xfff0bf, 1);
    graphics.fillCircle(16, 21, 2.4);
    graphics.fillCircle(27, 21, 2.4);
    graphics.fillStyle(0x321013, 1);
    graphics.fillCircle(16, 21, 1);
    graphics.fillCircle(27, 21, 1);
    graphics.fillStyle(0xffc46a, 0.72);
    graphics.fillCircle(21, 31, 4);
    graphics.lineStyle(2, 0x341015, 1);
    graphics.strokeRoundedRect(5, 9, 32, 27, 10);
    graphics.generateTexture("enemy-emberling", 42, 42);
    graphics.destroy();
  }

  private createM1Texture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x07100d, 0.34);
    graphics.fillEllipse(23, 43, 36, 9);
    graphics.fillStyle(0x183329, 1);
    graphics.fillRoundedRect(6, 12, 34, 29, 9);
    graphics.fillStyle(0x5fa66a, 1);
    graphics.fillRoundedRect(10, 10, 26, 25, 8);
    graphics.fillStyle(0xd9f99d, 1);
    graphics.fillCircle(17, 21, 3);
    graphics.fillCircle(29, 21, 3);
    graphics.fillStyle(0x0b1913, 1);
    graphics.fillCircle(18, 21, 1.2);
    graphics.fillCircle(30, 21, 1.2);
    graphics.fillStyle(0x263d2d, 1);
    graphics.fillTriangle(12, 10, 17, 1, 22, 12);
    graphics.fillTriangle(26, 10, 32, 1, 36, 13);
    graphics.fillStyle(0xf2c45f, 0.78);
    graphics.fillRoundedRect(17, 30, 12, 3, 2);
    graphics.lineStyle(2, 0x0b1913, 1);
    graphics.strokeRoundedRect(6, 12, 34, 29, 9);
    graphics.generateTexture("enemy-m1", 46, 50);
    graphics.destroy();
  }

  private createEnchantedM0Texture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x071a16, 0.36);
    graphics.fillEllipse(24, 44, 38, 9);
    graphics.lineStyle(4, 0x34563b, 1);
    graphics.lineBetween(12, 40, 5, 47);
    graphics.lineBetween(20, 40, 16, 49);
    graphics.lineBetween(30, 40, 34, 49);
    graphics.lineBetween(38, 40, 44, 47);
    graphics.fillStyle(0x173e34, 1);
    graphics.fillRoundedRect(7, 14, 34, 29, 12);
    graphics.fillStyle(0x477c45, 1);
    graphics.fillCircle(14, 14, 10);
    graphics.fillCircle(25, 10, 12);
    graphics.fillCircle(36, 15, 9);
    graphics.fillStyle(0x85b95b, 0.92);
    graphics.fillCircle(18, 8, 5);
    graphics.fillCircle(30, 7, 5);
    graphics.lineStyle(3, 0x6f8f51, 1);
    graphics.lineBetween(12, 16, 8, 4);
    graphics.lineBetween(36, 17, 41, 5);
    graphics.lineStyle(2, 0xbaf7c5, 1);
    graphics.strokeCircle(24, 29, 7);
    graphics.fillStyle(0x68f0d4, 0.88);
    graphics.fillCircle(24, 29, 3.8);
    graphics.fillStyle(0xd9ffbd, 1);
    graphics.fillCircle(16, 23, 2.5);
    graphics.fillCircle(33, 23, 2.5);
    graphics.fillStyle(0x10251e, 1);
    graphics.fillCircle(16, 23, 1);
    graphics.fillCircle(33, 23, 1);
    graphics.lineStyle(2, 0x0d2c26, 1);
    graphics.strokeRoundedRect(7, 14, 34, 29, 12);
    graphics.generateTexture("enchanted-enemy-m0", 48, 52);
    graphics.destroy();
  }

  private createEnchantedM1Texture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x071813, 0.36);
    graphics.fillEllipse(23, 45, 38, 9);
    graphics.fillStyle(0x2b4935, 1);
    graphics.fillTriangle(8, 19, 1, 12, 10, 8);
    graphics.fillTriangle(38, 19, 45, 12, 36, 8);
    graphics.fillStyle(0x3d5c37, 1);
    graphics.fillRoundedRect(6, 12, 34, 31, 9);
    graphics.fillStyle(0x6c7e43, 1);
    graphics.fillRoundedRect(10, 9, 26, 28, 8);
    graphics.fillStyle(0x9fbb62, 0.86);
    graphics.fillCircle(13, 12, 6);
    graphics.fillCircle(24, 8, 7);
    graphics.fillCircle(34, 13, 5);
    graphics.lineStyle(3, 0x294b34, 1);
    graphics.lineBetween(10, 35, 5, 47);
    graphics.lineBetween(18, 37, 16, 49);
    graphics.lineBetween(29, 37, 31, 49);
    graphics.lineBetween(37, 35, 42, 47);
    graphics.fillStyle(0x8dfff0, 1);
    graphics.fillTriangle(14, 20, 19, 17, 19, 23);
    graphics.fillTriangle(32, 20, 27, 17, 27, 23);
    graphics.fillStyle(0x12332d, 1);
    graphics.fillCircle(18, 20, 1.2);
    graphics.fillCircle(28, 20, 1.2);
    graphics.lineStyle(2, 0x6cebd1, 0.86);
    graphics.beginPath();
    graphics.moveTo(18, 29);
    graphics.lineTo(23, 26);
    graphics.lineTo(28, 29);
    graphics.lineTo(23, 34);
    graphics.closePath();
    graphics.strokePath();
    graphics.lineStyle(2, 0x162d22, 1);
    graphics.strokeRoundedRect(6, 12, 34, 31, 9);
    graphics.generateTexture("enchanted-enemy-m1", 46, 52);
    graphics.destroy();
  }

  private createVolcanicM0Texture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x120806, 0.44);
    graphics.fillEllipse(24, 46, 40, 9);
    graphics.fillStyle(0x241515, 1);
    graphics.fillRoundedRect(6, 13, 36, 31, 10);
    graphics.fillStyle(0x3a2020, 1);
    graphics.fillCircle(14, 14, 10);
    graphics.fillCircle(25, 10, 12);
    graphics.fillCircle(36, 15, 9);
    graphics.fillStyle(0xff5a1f, 0.96);
    graphics.fillCircle(17, 25, 2.8);
    graphics.fillCircle(33, 25, 2.8);
    graphics.lineStyle(3, 0xff6b23, 0.92);
    graphics.lineBetween(11, 35, 20, 29);
    graphics.lineBetween(20, 29, 26, 40);
    graphics.lineBetween(27, 18, 37, 35);
    graphics.lineStyle(1, 0xffc04d, 0.9);
    graphics.lineBetween(12, 34, 20, 29);
    graphics.lineBetween(28, 18, 36, 34);
    graphics.fillStyle(0x130a09, 1);
    graphics.fillCircle(17, 25, 1.1);
    graphics.fillCircle(33, 25, 1.1);
    graphics.lineStyle(2, 0x090506, 1);
    graphics.strokeRoundedRect(6, 13, 36, 31, 10);
    graphics.generateTexture("volcanic-enemy-m0", 48, 52);
    graphics.destroy();
  }

  private createVolcanicM1Texture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x120706, 0.42);
    graphics.fillEllipse(24, 46, 40, 9);
    graphics.fillStyle(0x160c0d, 1);
    graphics.fillTriangle(8, 19, 1, 8, 14, 13);
    graphics.fillTriangle(40, 19, 47, 8, 34, 13);
    graphics.fillStyle(0x302020, 1);
    graphics.fillRoundedRect(6, 12, 36, 32, 9);
    graphics.fillStyle(0x4a2620, 1);
    graphics.fillRoundedRect(10, 10, 28, 27, 8);
    graphics.fillStyle(0xff9b32, 1);
    graphics.fillTriangle(14, 21, 20, 18, 20, 24);
    graphics.fillTriangle(34, 21, 28, 18, 28, 24);
    graphics.lineStyle(3, 0xff4f1c, 0.92);
    graphics.beginPath();
    graphics.moveTo(13, 34);
    graphics.lineTo(23, 27);
    graphics.lineTo(29, 36);
    graphics.lineTo(38, 29);
    graphics.strokePath();
    graphics.lineStyle(1, 0xffc34d, 0.9);
    graphics.lineBetween(14, 33, 23, 27);
    graphics.lineBetween(29, 35, 37, 29);
    graphics.fillStyle(0x170909, 1);
    graphics.fillCircle(19, 21, 1.2);
    graphics.fillCircle(29, 21, 1.2);
    graphics.lineStyle(2, 0x090506, 1);
    graphics.strokeRoundedRect(6, 12, 36, 32, 9);
    graphics.generateTexture("volcanic-enemy-m1", 48, 52);
    graphics.destroy();
  }

  private createPowerProjectileTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x47d7ff, 0.18);
    graphics.fillEllipse(28, 16, 56, 30);
    graphics.fillStyle(0x7cf7ff, 0.72);
    graphics.fillEllipse(30, 16, 43, 20);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillEllipse(34, 16, 27, 10);
    graphics.fillStyle(0x8d6bff, 0.82);
    graphics.fillTriangle(0, 16, 20, 6, 20, 26);
    graphics.generateTexture("power-projectile", 58, 32);
    graphics.destroy();
  }

  private createCoinTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x7b5018, 1);
    graphics.fillCircle(13, 13, 11);
    graphics.fillStyle(0xf4c95f, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.fillStyle(0xffee9f, 1);
    graphics.fillCircle(9, 8, 3);
    graphics.lineStyle(2, 0x7b5018, 1);
    graphics.strokeCircle(12, 12, 8);
    graphics.generateTexture("coin", 26, 26);
    graphics.destroy();
  }

  private createInventoryPieceTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x06121a, 0.35);
    graphics.fillEllipse(14, 27, 24, 6);
    graphics.fillStyle(0x1d3542, 1);
    graphics.fillRoundedRect(5, 5, 18, 20, 5);
    graphics.fillStyle(0xbff7ee, 1);
    graphics.fillRoundedRect(8, 3, 14, 18, 4);
    graphics.fillStyle(0xffffff, 0.55);
    graphics.fillRect(11, 7, 8, 2);
    graphics.fillRect(11, 12, 6, 2);
    graphics.lineStyle(2, 0x08222b, 1);
    graphics.strokeRoundedRect(8, 3, 14, 18, 4);
    graphics.generateTexture("inventory-piece", 28, 30);
    graphics.destroy();
  }

  private createRewardBoxTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0a1210, 0.35);
    graphics.fillEllipse(24, 43, 42, 9);
    graphics.fillStyle(0x6f3f22, 1);
    graphics.fillRoundedRect(3, 15, 42, 27, 5);
    graphics.fillStyle(0xa96a32, 1);
    graphics.fillRoundedRect(3, 7, 42, 15, 6);
    graphics.fillStyle(0xd7a94f, 1);
    graphics.fillRect(21, 8, 6, 34);
    graphics.fillRoundedRect(18, 22, 12, 10, 3);
    graphics.fillStyle(0xffe7a0, 0.82);
    graphics.fillRect(20, 10, 3, 10);
    graphics.lineStyle(2, 0x301d14, 1);
    graphics.strokeRoundedRect(3, 7, 42, 35, 6);
    graphics.generateTexture("reward-box", 48, 48);
    graphics.destroy();
  }

  private createHealthHeartTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x7c1d39, 1);
    graphics.fillCircle(9, 9, 6);
    graphics.fillCircle(17, 9, 6);
    graphics.fillTriangle(4, 12, 22, 12, 13, 25);
    graphics.fillStyle(0xff5f7f, 1);
    graphics.fillCircle(9, 8, 5);
    graphics.fillCircle(17, 8, 5);
    graphics.fillTriangle(5, 11, 21, 11, 13, 23);
    graphics.fillStyle(0xffd4df, 1);
    graphics.fillCircle(9, 7, 2);
    graphics.generateTexture("health-heart", 26, 26);
    graphics.destroy();
  }

  private createSawTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xff2638, 0.18);
    graphics.fillCircle(22, 22, 21);
    graphics.fillStyle(0x74818c, 1);
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const x = 22 + Math.cos(angle) * 19;
      const y = 22 + Math.sin(angle) * 19;
      const nextX = 22 + Math.cos(angle + 0.2) * 13;
      const nextY = 22 + Math.sin(angle + 0.2) * 13;
      graphics.fillTriangle(22, 22, x, y, nextX, nextY);
    }
    graphics.fillStyle(0xdce6e4, 1);
    graphics.fillCircle(22, 22, 15);
    graphics.fillStyle(0x4a5960, 1);
    graphics.fillCircle(22, 22, 6);
    graphics.lineStyle(2, 0x29333a, 1);
    graphics.strokeCircle(22, 22, 15);
    graphics.generateTexture("hazard-saw", 44, 44);
    graphics.destroy();
  }

  private createCheckpointTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x2d1c13, 1);
    graphics.fillRoundedRect(4, 4, 6, 68, 3);
    graphics.fillStyle(0x5f3f1f, 1);
    graphics.fillRoundedRect(5, 5, 3, 66, 2);
    graphics.fillStyle(0x375c42, 1);
    graphics.fillRoundedRect(10, 9, 20, 26, 4);
    graphics.fillStyle(0xf2c45f, 1);
    graphics.fillCircle(20, 22, 5);
    graphics.lineStyle(2, 0x183421, 1);
    graphics.strokeRoundedRect(10, 9, 20, 26, 4);
    graphics.generateTexture("checkpoint", 34, 76);
    graphics.destroy();
  }

  private createGoalTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x2d1c13, 1);
    graphics.fillRoundedRect(3, 18, 8, 56, 4);
    graphics.fillRoundedRect(31, 18, 8, 56, 4);
    graphics.fillStyle(0x31553f, 1);
    graphics.fillRoundedRect(8, 8, 26, 14, 7);
    graphics.fillStyle(0xf2c45f, 1);
    graphics.fillCircle(21, 15, 5);
    graphics.lineStyle(3, 0x77d48b, 1);
    graphics.strokeCircle(21, 45, 20);
    graphics.lineStyle(2, 0xf2c45f, 1);
    graphics.strokeRoundedRect(8, 8, 26, 14, 7);
    graphics.generateTexture("goal", 42, 78);
    graphics.destroy();
  }

  private createSceneryTextures(): void {
    this.createGrassCapTexture();
    this.createStonePlatformTexture();
    this.createGroundFillTexture();
    this.createMoonTexture();
    this.createCloudTexture();
    this.createBroadTreeTexture();
    this.createPineTreeTexture();
    this.createLanternPostTexture();
    this.createBushTexture();
    this.createRockTexture();
  }

  private createGrassCapTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x182717, 1);
    graphics.fillRect(0, 9, 96, 15);
    graphics.fillStyle(0x6f9f2c, 1);
    graphics.fillRect(0, 5, 96, 8);
    graphics.fillStyle(0xa8d844, 1);
    graphics.fillRect(0, 1, 96, 5);
    graphics.fillStyle(0xdbf36c, 1);

    for (let x = 4; x < 96; x += 10) {
      graphics.fillRect(x, 0, 3, 4);
      graphics.fillRect(x + 4, 2, 2, 5);
    }

    graphics.fillStyle(0x304b21, 1);
    for (let x = 2; x < 96; x += 12) {
      graphics.fillRect(x, 12, 5, 4);
      graphics.fillRect(x + 7, 15, 8, 3);
    }

    graphics.generateTexture("terrain-grass-cap", 96, 24);
    graphics.destroy();
  }

  private createStonePlatformTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x151b1f, 1);
    graphics.fillRect(0, 0, 96, 48);
    graphics.fillStyle(0x2f383d, 1);
    graphics.fillRoundedRect(3, 4, 23, 15, 3);
    graphics.fillRoundedRect(29, 3, 31, 18, 4);
    graphics.fillRoundedRect(63, 5, 28, 14, 3);
    graphics.fillStyle(0x222a2f, 1);
    graphics.fillRoundedRect(0, 23, 30, 18, 4);
    graphics.fillRoundedRect(34, 24, 25, 16, 3);
    graphics.fillRoundedRect(62, 22, 34, 19, 4);
    graphics.fillStyle(0x465158, 1);
    graphics.fillRect(8, 7, 10, 2);
    graphics.fillRect(36, 7, 14, 2);
    graphics.fillRect(69, 9, 12, 2);
    graphics.fillStyle(0x0b1013, 0.82);
    graphics.fillRect(0, 43, 96, 5);
    graphics.lineStyle(1, 0x0b1013, 0.85);
    graphics.strokeRoundedRect(3, 4, 23, 15, 3);
    graphics.strokeRoundedRect(29, 3, 31, 18, 4);
    graphics.strokeRoundedRect(63, 5, 28, 14, 3);
    graphics.strokeRoundedRect(0, 23, 30, 18, 4);
    graphics.strokeRoundedRect(34, 24, 25, 16, 3);
    graphics.strokeRoundedRect(62, 22, 34, 19, 4);
    graphics.generateTexture("terrain-stone-platform", 96, 48);
    graphics.destroy();
  }

  private createGroundFillTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x091417, 1);
    graphics.fillRect(0, 0, 96, 64);
    graphics.fillStyle(0x162429, 1);

    for (let index = 0; index < 10; index += 1) {
      const x = (index * 17) % 92;
      const y = 8 + ((index * 19) % 48);
      graphics.fillRoundedRect(x, y, 12 + (index % 3) * 5, 8 + (index % 2) * 4, 3);
    }

    graphics.fillStyle(0x26333a, 0.85);
    graphics.fillRect(9, 10, 13, 2);
    graphics.fillRect(45, 33, 18, 2);
    graphics.fillRect(69, 18, 11, 2);
    graphics.generateTexture("terrain-ground-fill", 96, 64);
    graphics.destroy();
  }

  private createMoonTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xd9e7f0, 0.08);
    graphics.fillCircle(75, 75, 74);
    graphics.fillStyle(0xf3e5bc, 1);
    graphics.fillCircle(75, 75, 56);
    graphics.fillStyle(0xb9b095, 0.44);
    graphics.fillCircle(54, 60, 11);
    graphics.fillCircle(88, 49, 8);
    graphics.fillCircle(96, 87, 13);
    graphics.fillCircle(66, 101, 9);
    graphics.fillStyle(0xfff4cb, 0.7);
    graphics.fillCircle(58, 42, 10);
    graphics.fillCircle(42, 82, 7);
    graphics.fillCircle(82, 107, 8);
    graphics.lineStyle(3, 0xfff3c9, 0.38);
    graphics.strokeCircle(75, 75, 57);
    graphics.generateTexture("forest-moon", 150, 150);
    graphics.destroy();
  }

  private createCloudTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x203b55, 0.62);
    graphics.fillEllipse(44, 50, 74, 30);
    graphics.fillEllipse(91, 43, 86, 39);
    graphics.fillEllipse(146, 50, 74, 27);
    graphics.fillStyle(0x47647c, 0.34);
    graphics.fillEllipse(75, 34, 64, 26);
    graphics.fillEllipse(128, 34, 54, 22);
    graphics.fillStyle(0x0e2437, 0.5);
    graphics.fillRect(28, 55, 154, 7);
    graphics.generateTexture("forest-cloud", 220, 80);
    graphics.destroy();
  }

  private createBroadTreeTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1f120b, 1);
    graphics.fillRoundedRect(112, 108, 34, 176, 13);
    graphics.fillStyle(0x4a2b18, 1);
    graphics.fillRoundedRect(123, 112, 12, 158, 6);
    graphics.lineStyle(8, 0x2a170d, 1);
    graphics.lineBetween(128, 151, 72, 95);
    graphics.lineBetween(130, 160, 194, 98);
    graphics.lineBetween(132, 178, 83, 134);
    graphics.lineBetween(134, 184, 184, 146);
    graphics.fillStyle(0x132e1e, 1);
    graphics.fillEllipse(126, 100, 185, 114);
    graphics.fillEllipse(79, 129, 110, 95);
    graphics.fillEllipse(178, 126, 128, 98);
    graphics.fillStyle(0x2f6b35, 1);
    graphics.fillEllipse(116, 77, 112, 70);
    graphics.fillEllipse(60, 118, 82, 67);
    graphics.fillEllipse(183, 105, 99, 76);
    graphics.fillStyle(0x6f9f2c, 0.94);
    for (let index = 0; index < 46; index += 1) {
      const x = 34 + ((index * 37) % 181);
      const y = 44 + ((index * 29) % 112);
      const size = 7 + (index % 4) * 3;
      graphics.fillRect(x, y, size, size);
    }
    graphics.fillStyle(0x9bcf3a, 0.6);
    for (let index = 0; index < 18; index += 1) {
      const x = 56 + ((index * 43) % 144);
      const y = 48 + ((index * 31) % 76);
      graphics.fillRect(x, y, 8, 5);
    }
    graphics.fillStyle(0x07100d, 0.35);
    graphics.fillEllipse(130, 289, 132, 18);
    graphics.generateTexture("forest-broad-tree", 260, 310);
    graphics.destroy();
  }

  private createPineTreeTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x27170d, 1);
    graphics.fillRect(44, 135, 13, 82);
    graphics.fillStyle(0x0b2018, 1);
    graphics.fillTriangle(50, 0, 4, 86, 96, 86);
    graphics.fillTriangle(50, 43, 0, 137, 100, 137);
    graphics.fillTriangle(50, 90, 7, 183, 93, 183);
    graphics.fillStyle(0x1c5634, 1);
    graphics.fillTriangle(50, 11, 16, 78, 84, 78);
    graphics.fillTriangle(50, 55, 10, 128, 90, 128);
    graphics.fillTriangle(50, 103, 18, 174, 82, 174);
    graphics.fillStyle(0x3e7b43, 0.72);
    graphics.fillRect(36, 55, 21, 5);
    graphics.fillRect(28, 109, 28, 5);
    graphics.fillRect(50, 139, 26, 5);
    graphics.fillStyle(0x07100d, 0.4);
    graphics.fillEllipse(50, 218, 80, 13);
    graphics.generateTexture("forest-pine-tree", 100, 230);
    graphics.destroy();
  }

  private createLanternPostTexture(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(6, 0x4a2b18, 1);
    graphics.lineBetween(26, 42, 26, 142);
    graphics.lineBetween(18, 48, 70, 48);
    graphics.lineStyle(4, 0x26150c, 1);
    graphics.lineBetween(66, 48, 66, 74);
    graphics.fillStyle(0x7a441f, 1);
    graphics.fillRect(13, 137, 26, 8);
    graphics.fillStyle(0x26150c, 1);
    graphics.fillRoundedRect(51, 73, 30, 39, 4);
    graphics.fillStyle(0xffd25a, 1);
    graphics.fillRoundedRect(57, 80, 18, 25, 3);
    graphics.fillStyle(0xfff1a1, 0.86);
    graphics.fillRect(61, 82, 7, 19);
    graphics.fillStyle(0xffb22e, 0.16);
    graphics.fillCircle(66, 94, 35);
    graphics.fillStyle(0x8d1f2a, 1);
    graphics.fillRect(8, 64, 32, 42);
    graphics.fillStyle(0xf2c45f, 1);
    graphics.fillRect(20, 74, 8, 17);
    graphics.lineStyle(2, 0x381b13, 1);
    graphics.strokeRect(8, 64, 32, 42);
    graphics.generateTexture("forest-lantern-post", 92, 152);
    graphics.destroy();
  }

  private createBushTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0c261a, 1);
    graphics.fillEllipse(54, 34, 96, 42);
    graphics.fillStyle(0x265f35, 1);
    graphics.fillEllipse(28, 29, 46, 33);
    graphics.fillEllipse(58, 21, 58, 38);
    graphics.fillEllipse(89, 31, 48, 34);
    graphics.fillStyle(0x7eb23a, 0.85);
    for (let index = 0; index < 22; index += 1) {
      const x = 9 + ((index * 23) % 91);
      const y = 10 + ((index * 17) % 31);
      graphics.fillRect(x, y, 5 + (index % 3), 4);
    }
    graphics.generateTexture("forest-bush", 112, 58);
    graphics.destroy();
  }

  private createRockTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10171a, 0.32);
    graphics.fillEllipse(56, 49, 96, 15);
    graphics.fillStyle(0x5f6664, 1);
    graphics.fillRoundedRect(19, 21, 35, 28, 8);
    graphics.fillRoundedRect(48, 11, 29, 38, 9);
    graphics.fillRoundedRect(72, 25, 27, 24, 7);
    graphics.fillStyle(0x9ba195, 0.72);
    graphics.fillRect(28, 25, 13, 3);
    graphics.fillRect(55, 17, 10, 3);
    graphics.fillRect(78, 29, 8, 3);
    graphics.fillStyle(0x2e373a, 1);
    graphics.fillRect(20, 43, 75, 6);
    graphics.generateTexture("forest-rocks", 112, 60);
    graphics.destroy();
  }
}
