import type { ConditionKind } from "./weather";

type Group = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

function group(kind: ConditionKind): Group {
  switch (kind) {
    case "clear":
      return "clear";
    case "partly":
      return "partly";
    case "cloudy":
    case "overcast":
      return "cloudy";
    case "fog":
      return "fog";
    case "drizzle":
    case "rain":
    case "heavy-rain":
      return "rain";
    case "sleet":
    case "snow":
      return "snow";
    case "storm":
      return "storm";
  }
}

type Wash = { warm: string; cool: string };

const DAY: Record<Group, Wash> = {
  clear: { warm: "rgba(255, 176, 102, 0.3)", cool: "rgba(127, 196, 255, 0.16)" },
  partly: { warm: "rgba(255, 176, 102, 0.22)", cool: "rgba(127, 196, 255, 0.2)" },
  cloudy: { warm: "rgba(198, 196, 190, 0.14)", cool: "rgba(140, 176, 208, 0.14)" },
  fog: { warm: "rgba(208, 206, 200, 0.16)", cool: "rgba(168, 186, 202, 0.16)" },
  rain: { warm: "rgba(168, 178, 190, 0.12)", cool: "rgba(104, 158, 214, 0.22)" },
  snow: { warm: "rgba(214, 224, 236, 0.18)", cool: "rgba(150, 192, 236, 0.18)" },
  storm: { warm: "rgba(140, 148, 162, 0.1)", cool: "rgba(82, 118, 166, 0.22)" },
};

const NIGHT: Record<Group, Wash> = {
  clear: { warm: "rgba(255, 186, 126, 0.1)", cool: "rgba(92, 128, 196, 0.22)" },
  partly: { warm: "rgba(226, 190, 150, 0.08)", cool: "rgba(96, 130, 194, 0.2)" },
  cloudy: { warm: "rgba(170, 176, 186, 0.1)", cool: "rgba(104, 130, 166, 0.14)" },
  fog: { warm: "rgba(180, 186, 194, 0.1)", cool: "rgba(120, 140, 162, 0.14)" },
  rain: { warm: "rgba(150, 160, 176, 0.08)", cool: "rgba(76, 118, 176, 0.2)" },
  snow: { warm: "rgba(186, 200, 218, 0.12)", cool: "rgba(120, 160, 208, 0.18)" },
  storm: { warm: "rgba(120, 128, 146, 0.08)", cool: "rgba(62, 96, 148, 0.22)" },
};

/**
 * Two faint corner lights — one warm, one cool — that the page takes from the
 * current sky. Same shape as the light in the portfolio, tinted by the weather.
 */
export function skyWash(kind: ConditionKind, isDay: boolean): Wash {
  return (isDay ? DAY : NIGHT)[group(kind)];
}
