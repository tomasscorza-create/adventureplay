export interface PuzzleVisualPalette {
  background: number;
  body: number;
  lowerFace: number;
  textureTint: number;
  topEdge: number;
  outline: number;
  shadow: number;
  objectTint: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rgbChannels(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

function rgbToHsl(color: number): HslColor {
  const [redByte, greenByte, blueByte] = rgbChannels(color);
  const red = redByte / 255;
  const green = greenByte / 255;
  const blue = blueByte / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (delta > 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }: HslColor): number {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const intermediate = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, intermediate];
  else if (section < 2) [red, green] = [intermediate, chroma];
  else if (section < 3) [green, blue] = [chroma, intermediate];
  else if (section < 4) [green, blue] = [intermediate, chroma];
  else if (section < 5) [red, blue] = [intermediate, chroma];
  else [red, blue] = [chroma, intermediate];

  const match = l - chroma / 2;
  return (Math.round((red + match) * 255) << 16)
    | (Math.round((green + match) * 255) << 8)
    | Math.round((blue + match) * 255);
}

export function averageOpaqueColor(pixels: Uint8ClampedArray): number {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha < 0.2) continue;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    weight += alpha;
  }

  if (weight === 0) return 0x182635;
  return (Math.round(red / weight) << 16)
    | (Math.round(green / weight) << 8)
    | Math.round(blue / weight);
}

export function derivePuzzleVisualPalette(background: number): PuzzleVisualPalette {
  const source = rgbToHsl(background);
  const complementaryHue = (source.h + 180) % 360;
  const saturation = clamp(source.s * 0.72 + 0.22, 0.38, 0.68);
  const hasLightBackground = source.l >= 0.48;

  return {
    background,
    body: hslToRgb({ h: complementaryHue, s: saturation * 0.58, l: hasLightBackground ? 0.2 : 0.3 }),
    lowerFace: hslToRgb({ h: complementaryHue, s: saturation * 0.64, l: hasLightBackground ? 0.11 : 0.17 }),
    textureTint: hslToRgb({ h: complementaryHue, s: saturation * 0.42, l: hasLightBackground ? 0.43 : 0.69 }),
    topEdge: hslToRgb({ h: complementaryHue, s: saturation, l: hasLightBackground ? 0.15 : 0.76 }),
    outline: hslToRgb({ h: complementaryHue, s: saturation * 0.52, l: hasLightBackground ? 0.08 : 0.88 }),
    shadow: hasLightBackground ? 0x05080b : 0x020406,
    objectTint: hslToRgb({ h: complementaryHue, s: saturation * 0.28, l: hasLightBackground ? 0.62 : 0.86 }),
  };
}
