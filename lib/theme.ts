import type { ConditionKind } from "./weather";

/* The page takes its colors from the sky at the place: the time of day sets
   the base, the weather washes over it, and text is darkened or lightened
   until it reads at 4.5:1 on whatever background that produces. */

export type Phase = "dawn" | "day" | "dusk" | "night";
export type Sky = "clear" | "partly" | "cloud" | "rain" | "snow" | "storm";

const TWILIGHT_MINUTES = 45;

const PHASES: Record<Phase, { paper: string; ink: string; dark: boolean; sun: string }> = {
  // dawn and dusk are blue hour: the sky is dim, so text goes light
  dawn: { paper: "#151c30", ink: "#ecf0f7", dark: true, sun: "#f4a8a0" },
  day: { paper: "#e5eff9", ink: "#0f1a29", dark: false, sun: "#9a5a07" },
  dusk: { paper: "#141829", ink: "#ecf0f7", dark: true, sun: "#f2a65a" },
  night: { paper: "#0b1020", ink: "#e8ecf6", dark: true, sun: "#f2b75e" },
};

// How far each sky pulls the base toward its own tint, on light and dark bases.
const SKIES: Record<Sky, { light: string; dark: string; amount: number }> = {
  clear: { light: "#ffffff", dark: "#000000", amount: 0 },
  partly: { light: "#d3d7dc", dark: "#1d2128", amount: 0.3 },
  cloud: { light: "#cdd1d6", dark: "#1d2128", amount: 0.65 },
  rain: { light: "#b9c4cf", dark: "#111a25", amount: 0.65 },
  snow: { light: "#f3f6f9", dark: "#283040", amount: 0.6 },
  storm: { light: "#a3abb5", dark: "#0c0e13", amount: 0.72 },
};

const RAIN = { light: "#245a92", dark: "#8bbcf0" };

export function skyOf(kind: ConditionKind): Sky {
  switch (kind) {
    case "clear":
      return "clear";
    case "partly":
      return "partly";
    case "cloudy":
    case "overcast":
    case "fog":
      return "cloud";
    case "snow":
      return "snow";
    case "storm":
      return "storm";
    default:
      return "rain";
  }
}

/** Phase from local minutes; falls back to the API's day flag before the clock is known. */
export function phaseOf(
  nowMinutes: number | null,
  sunriseMinutes: number,
  sunsetMinutes: number,
  isDay: boolean,
): Phase {
  if (nowMinutes == null) return isDay ? "day" : "night";
  if (Math.abs(nowMinutes - sunriseMinutes) <= TWILIGHT_MINUTES) return "dawn";
  if (Math.abs(nowMinutes - sunsetMinutes) <= TWILIGHT_MINUTES) return "dusk";
  return nowMinutes > sunriseMinutes && nowMinutes < sunsetMinutes ? "day" : "night";
}

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (rgb: Rgb) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export function mix(from: string, to: string, amount: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount) as Rgb);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pushes a text color toward the ink until it reads on the background. */
function readable(color: string, background: string, ink: string): string {
  let result = color;
  for (let step = 1; step <= 10 && contrast(result, background) < 4.5; step += 1) {
    result = mix(color, ink, step / 10);
  }
  return result;
}

const alpha = (hex: string, opacity: number) => `rgba(${toRgb(hex).join(", ")}, ${opacity})`;

export type Theme = { phase: Phase; sky: Sky; dark: boolean; vars: Record<string, string> };

export function themeFor(phase: Phase, sky: Sky): Theme {
  const base = PHASES[phase];
  const tint = SKIES[sky];
  const paper = mix(base.paper, base.dark ? tint.dark : tint.light, tint.amount);
  const ink = base.ink;

  return {
    phase,
    sky,
    dark: base.dark,
    vars: {
      "--paper": paper,
      "--raised": mix(paper, ink, base.dark ? 0.1 : 0.07),
      "--night": base.dark ? mix(paper, "#000000", 0.45) : mix(paper, ink, 0.07),
      "--ink": ink,
      // light themes sit over bright cloud, so their muted text stays darker
      "--muted": readable(mix(ink, paper, base.dark ? 0.45 : 0.22), paper, ink),
      "--line": alpha(ink, base.dark ? 0.1 : 0.12),
      "--tick": alpha(ink, 0.3),
      "--rain": readable(base.dark ? RAIN.dark : RAIN.light, paper, ink),
      "--sun": base.sun,
      "--sun-ink": readable(base.dark ? base.sun : mix(base.sun, ink, 0.45), paper, ink),
      "--live": base.dark ? "#4cc38a" : "#2f8a4c",
      "--pending": base.dark ? "#f0b45a" : "#b8740f",
      "--offline": alpha(ink, 0.35),
      colorScheme: base.dark ? "dark" : "light",
    },
  };
}

export const PHASE_LIST = Object.keys(PHASES) as Phase[];
export const SKY_LIST = Object.keys(SKIES) as Sky[];

/** Sun elevation and azimuth (radians, azimuth clockwise from north) for a place and moment. */
export function sunPosition(date: Date, latitude: number, longitude: number) {
  const rad = Math.PI / 180;
  const days = date.getTime() / 86_400_000 - 10_957.5; // since J2000.0
  const anomaly = (357.529 + 0.98560028 * days) * rad;
  const meanLongitude = 280.459 + 0.98564736 * days;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * rad;
  const obliquity = (23.439 - 0.00000036 * days) * rad;
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const siderealHours = (18.697374558 + 24.06570982441908 * days) % 24;
  const hourAngle = (siderealHours * 15 + longitude) * rad - rightAscension;
  const lat = latitude * rad;

  const elevation = Math.asin(
    Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuth =
    Math.atan2(
      -Math.sin(hourAngle),
      Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle),
    ) + Math.PI * 2;
  return { elevation, azimuth: azimuth % (Math.PI * 2) };
}
