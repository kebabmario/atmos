export type Place = {
  id?: number;
  name: string;
  admin1?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

export type CurrentConditions = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  visibility: number;
};

export type HourlyPoint = {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
  isDay: boolean;
  uvIndex: number;
};

export type DailyPoint = {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  sunrise: string;
  sunset: string;
  uvMax: number;
  precipitationProbability: number;
  daylightDuration: number;
};

export type WeatherReport = {
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

export type TemperatureUnit = "c" | "f";

export type ConditionKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "sleet"
  | "snow"
  | "storm";

const CONDITIONS: Record<number, { label: string; kind: ConditionKind }> = {
  0: { label: "Clear", kind: "clear" },
  1: { label: "Mostly clear", kind: "clear" },
  2: { label: "Partly cloudy", kind: "partly" },
  3: { label: "Overcast", kind: "overcast" },
  45: { label: "Fog", kind: "fog" },
  48: { label: "Freezing fog", kind: "fog" },
  51: { label: "Light drizzle", kind: "drizzle" },
  53: { label: "Drizzle", kind: "drizzle" },
  55: { label: "Heavy drizzle", kind: "drizzle" },
  56: { label: "Freezing drizzle", kind: "sleet" },
  57: { label: "Freezing drizzle", kind: "sleet" },
  61: { label: "Light rain", kind: "rain" },
  63: { label: "Rain", kind: "rain" },
  65: { label: "Heavy rain", kind: "heavy-rain" },
  66: { label: "Freezing rain", kind: "sleet" },
  67: { label: "Freezing rain", kind: "sleet" },
  71: { label: "Light snow", kind: "snow" },
  73: { label: "Snow", kind: "snow" },
  75: { label: "Heavy snow", kind: "snow" },
  77: { label: "Snow grains", kind: "snow" },
  80: { label: "Light showers", kind: "rain" },
  81: { label: "Showers", kind: "rain" },
  82: { label: "Violent showers", kind: "heavy-rain" },
  85: { label: "Snow showers", kind: "snow" },
  86: { label: "Heavy snow showers", kind: "snow" },
  95: { label: "Thunderstorm", kind: "storm" },
  96: { label: "Storm with hail", kind: "storm" },
  99: { label: "Severe storm", kind: "storm" },
};

export function describeWeather(code: number): { label: string; kind: ConditionKind } {
  return CONDITIONS[code] ?? { label: "Unsettled", kind: "cloudy" };
}

export function celsiusTo(value: number, unit: TemperatureUnit): number {
  return unit === "f" ? (value * 9) / 5 + 32 : value;
}

export function formatTemperature(value: number, unit: TemperatureUnit): string {
  return `${Math.round(celsiusTo(value, unit))}°`;
}

export function formatTemperatureValue(value: number, unit: TemperatureUnit): number {
  return Math.round(celsiusTo(value, unit));
}

export function windReading(kmh: number, unit: TemperatureUnit): { value: number; unit: string } {
  return unit === "f"
    ? { value: Math.round(kmh * 0.621371), unit: "mph" }
    : { value: Math.round(kmh), unit: "km/h" };
}

export function visibilityReading(
  meters: number,
  unit: TemperatureUnit,
): { value: string; unit: string } {
  if (unit === "f") {
    const miles = meters / 1609.344;
    return { value: miles >= 10 ? `${Math.round(miles)}` : miles.toFixed(1), unit: "mi" };
  }

  const km = meters / 1000;
  return { value: km >= 10 ? `${Math.round(km)}` : km.toFixed(1), unit: "km" };
}

export function pressureReading(
  hPa: number,
  unit: TemperatureUnit,
): { value: string; unit: string } {
  return unit === "f"
    ? { value: (hPa * 0.02953).toFixed(2), unit: "inHg" }
    : { value: `${Math.round(hPa)}`, unit: "hPa" };
}

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export function windDirection(degrees: number): string {
  return COMPASS[Math.round(((degrees % 360) / 22.5)) % 16];
}

export function uvDescriptor(uv: number): { label: string; tone: string } {
  if (uv < 3) return { label: "Low", tone: "#8fd3b4" };
  if (uv < 6) return { label: "Moderate", tone: "#edd393" };
  if (uv < 8) return { label: "High", tone: "#f0b07c" };
  if (uv < 11) return { label: "Very high", tone: "#e78f86" };
  return { label: "Extreme", tone: "#df7f9b" };
}

export function humidityDescriptor(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 80) return "Humid";
  return "Very humid";
}

export function pressureDescriptor(hPa: number): string {
  if (hPa >= 1023) return "High";
  if (hPa <= 1009) return "Low";
  return "Steady";
}

export function visibilityDescriptor(meters: number): string {
  if (meters >= 10000) return "Clear view";
  if (meters >= 4000) return "Moderate";
  if (meters >= 1000) return "Hazy";
  return "Poor";
}

export function formatHourLabel(time: string): string {
  const hour = Number(time.slice(11, 13));
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${suffix}`;
}

export function formatClock(time: string): string {
  const hour = Number(time.slice(11, 13));
  const minute = Number(time.slice(14, 16));
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(parsed);
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function minutesSinceMidnight(isoLocal: string): number {
  return Number(isoLocal.slice(11, 13)) * 60 + Number(isoLocal.slice(14, 16));
}

export function currentMinutes(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function formatLocalTime(timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date());
}

export function formatLocalDate(timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date());
}

export function placeSubtitle(place: Place): string {
  return [place.admin1, place.country].filter(Boolean).join(", ");
}

export function currentUvIndex(hourly: HourlyPoint[], currentTime: string, fallback: number): number {
  const match = hourly.find((point) => point.time.slice(0, 13) === currentTime.slice(0, 13));
  return match ? match.uvIndex : fallback;
}

export function upcomingHours(hourly: HourlyPoint[], currentTime: string, count = 24): HourlyPoint[] {
  const start = hourly.findIndex((point) => point.time.slice(0, 13) >= currentTime.slice(0, 13));
  const index = start === -1 ? Math.max(hourly.length - count, 0) : start;
  return hourly.slice(index, index + count);
}

export function daylightProgress(
  sunrise: string,
  sunset: string,
  now: number,
): { progress: number; isDaylight: boolean } {
  const sunriseMinutes = minutesSinceMidnight(sunrise);
  const sunsetMinutes = minutesSinceMidnight(sunset);
  const span = Math.max(sunsetMinutes - sunriseMinutes, 1);
  const progress = (now - sunriseMinutes) / span;
  return {
    progress: Math.min(Math.max(progress, 0), 1),
    isDaylight: now >= sunriseMinutes && now <= sunsetMinutes,
  };
}
