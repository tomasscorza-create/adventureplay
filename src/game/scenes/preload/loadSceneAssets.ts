import amyUrl from "../../../assets/characters/amy.png";
import dunelUrl from "../../../assets/characters/dunel.png";
import faustUrl from "../../../assets/characters/faust.png";
import sarixUrl from "../../../assets/characters/sarix.png";
import m2Url from "../../../assets/enemies/m2.png";
import m3Run1Url from "../../../assets/enemies/m3-run-1.png";
import m3Run2Url from "../../../assets/enemies/m3-run-2.png";
import m3Run3Url from "../../../assets/enemies/m3-run-3.png";
import m3Run4Url from "../../../assets/enemies/m3-run-4.png";
import m3Run5Url from "../../../assets/enemies/m3-run-5.png";
import enchantedM2Brake1Url from "../../../assets/enemies/enchanted-m2/brake-1.png";
import enchantedM2Brake2Url from "../../../assets/enemies/enchanted-m2/brake-2.png";
import enchantedM2Defeat1Url from "../../../assets/enemies/enchanted-m2/defeat-1.png";
import enchantedM2Defeat2Url from "../../../assets/enemies/enchanted-m2/defeat-2.png";
import enchantedM2DiveUrl from "../../../assets/enemies/enchanted-m2/dive.png";
import enchantedM2Flight1Url from "../../../assets/enemies/enchanted-m2/flight-1.png";
import enchantedM2Flight2Url from "../../../assets/enemies/enchanted-m2/flight-2.png";
import enchantedM2Flight3Url from "../../../assets/enemies/enchanted-m2/flight-3.png";
import enchantedM2RecoverUrl from "../../../assets/enemies/enchanted-m2/recover.png";
import enchantedM2WindupUrl from "../../../assets/enemies/enchanted-m2/windup.png";
import enchantedM3Attack1Url from "../../../assets/enemies/enchanted-m3/attack-1.png";
import enchantedM3Attack2Url from "../../../assets/enemies/enchanted-m3/attack-2.png";
import enchantedM3Defeat1Url from "../../../assets/enemies/enchanted-m3/defeat-1.png";
import enchantedM3Defeat2Url from "../../../assets/enemies/enchanted-m3/defeat-2.png";
import enchantedM3IdleUrl from "../../../assets/enemies/enchanted-m3/idle.png";
import enchantedM3Run1Url from "../../../assets/enemies/enchanted-m3/run-1.png";
import enchantedM3Run2Url from "../../../assets/enemies/enchanted-m3/run-2.png";
import playerKnightUrl from "../../../assets/player-knight.png";
import bushUrl from "../../../assets/scenery/bush.png";
import cloudsUrl from "../../../assets/scenery/clouds.png";
import crystalsUrl from "../../../assets/scenery/crystals.png";
import enchantedBackgroundUrl from "../../../assets/scenery/enchanted-forest/background.png";
import enchantedTree1Url from "../../../assets/scenery/enchanted-forest/tree-1.png";
import enchantedTree2Url from "../../../assets/scenery/enchanted-forest/tree-2.png";
import enchantedTree3Url from "../../../assets/scenery/enchanted-forest/tree-3.png";
import enchantedTree4Url from "../../../assets/scenery/enchanted-forest/tree-4.png";
import floorStripUrl from "../../../assets/scenery/forest-floor-strip.png";
import lanternPostUrl from "../../../assets/scenery/lantern-post.png";
import moonUrl from "../../../assets/scenery/moon-new-game.png";
import mushroomsUrl from "../../../assets/scenery/mushrooms.png";
import pineUrl from "../../../assets/scenery/pine.png";
import rocksUrl from "../../../assets/scenery/rocks.png";
import treeLargeUrl from "../../../assets/scenery/tree-large.png";
import treeMediumUrl from "../../../assets/scenery/tree-medium.png";
import treeSmallUrl from "../../../assets/scenery/tree-small.png";
import depthFogUrl from "../../../assets/terrain/depth-fog.png";
import groundLeftUrl from "../../../assets/terrain/ground-left.png";
import groundMidAUrl from "../../../assets/terrain/ground-mid-a.png";
import groundMidBUrl from "../../../assets/terrain/ground-mid-b.png";
import groundRightUrl from "../../../assets/terrain/ground-right.png";
import platformLeftUrl from "../../../assets/terrain/platform-left.png";
import platformMidAUrl from "../../../assets/terrain/platform-mid-a.png";
import platformMidBUrl from "../../../assets/terrain/platform-mid-b.png";
import platformRightUrl from "../../../assets/terrain/platform-right.png";
import surfaceGrassDetailUrl from "../../../assets/terrain/surface-grass-detail.png";
import surfaceRocksUrl from "../../../assets/terrain/surface-rocks.png";
import sword1Url from "../../../assets/weapons/sword-1.png";
import type Phaser from "phaser";

export function loadSceneAssets(scene: Phaser.Scene): void {
    scene.load.spritesheet("character-ruder", playerKnightUrl, {
      frameWidth: 96,
      frameHeight: 80,
    });
    scene.load.image("character-source-amy", amyUrl);
    scene.load.image("character-source-dunel", dunelUrl);
    scene.load.image("character-source-sarix", sarixUrl);
    scene.load.spritesheet("character-faust", faustUrl, {
      frameWidth: 96,
      frameHeight: 80,
    });
    scene.load.image("weapon-sword-1", sword1Url);
    scene.load.spritesheet("enemy-m2", m2Url, {
      frameWidth: 256,
      frameHeight: 363,
    });
    [m3Run1Url, m3Run2Url, m3Run3Url, m3Run4Url, m3Run5Url].forEach((url, index) => {
      scene.load.image(`enemy-m3-run-${index + 1}`, url);
    });
    const enchantedM2Sources = [
      enchantedM2Flight1Url,
      enchantedM2Flight2Url,
      enchantedM2Flight3Url,
      enchantedM2Brake1Url,
      enchantedM2Brake2Url,
      enchantedM2WindupUrl,
      enchantedM2DiveUrl,
      enchantedM2RecoverUrl,
      enchantedM2Defeat1Url,
      enchantedM2Defeat2Url,
    ];
    enchantedM2Sources.forEach((url, index) => {
      scene.load.image(`enchanted-m2-source-${index + 1}`, url);
    });
    scene.load.image("enchanted-m3-idle", enchantedM3IdleUrl);
    scene.load.image("enchanted-m3-run-1", enchantedM3Run1Url);
    scene.load.image("enchanted-m3-run-2", enchantedM3Run2Url);
    scene.load.image("enchanted-m3-attack-1", enchantedM3Attack1Url);
    scene.load.image("enchanted-m3-attack-2", enchantedM3Attack2Url);
    scene.load.image("enchanted-m3-defeat-1", enchantedM3Defeat1Url);
    scene.load.image("enchanted-m3-defeat-2", enchantedM3Defeat2Url);
    scene.load.image("scenery-bush", bushUrl);
    scene.load.image("scenery-clouds", cloudsUrl);
    scene.load.image("scenery-crystals", crystalsUrl);
    scene.load.image("enchanted-background", enchantedBackgroundUrl);
    scene.load.image("enchanted-tree-1", enchantedTree1Url);
    scene.load.image("enchanted-tree-2", enchantedTree2Url);
    scene.load.image("enchanted-tree-3", enchantedTree3Url);
    scene.load.image("enchanted-tree-4", enchantedTree4Url);
    scene.load.image("scenery-floor-strip", floorStripUrl);
    scene.load.image("scenery-lantern-post", lanternPostUrl);
    scene.load.image("scenery-moon", moonUrl);
    scene.load.image("scenery-mushrooms", mushroomsUrl);
    scene.load.image("scenery-pine", pineUrl);
    scene.load.image("scenery-rocks", rocksUrl);
    scene.load.image("scenery-tree-large", treeLargeUrl);
    scene.load.image("scenery-tree-medium", treeMediumUrl);
    scene.load.image("scenery-tree-small", treeSmallUrl);
    scene.load.image("terrain-depth-fog", depthFogUrl);
    scene.load.image("terrain-ground-left", groundLeftUrl);
    scene.load.image("terrain-ground-mid-a", groundMidAUrl);
    scene.load.image("terrain-ground-mid-b", groundMidBUrl);
    scene.load.image("terrain-ground-right", groundRightUrl);
    scene.load.image("terrain-platform-left", platformLeftUrl);
    scene.load.image("terrain-platform-mid-a", platformMidAUrl);
    scene.load.image("terrain-platform-mid-b", platformMidBUrl);
    scene.load.image("terrain-platform-right", platformRightUrl);
    scene.load.image("terrain-surface-grass-detail", surfaceGrassDetailUrl);
    scene.load.image("terrain-surface-rocks", surfaceRocksUrl);
}
