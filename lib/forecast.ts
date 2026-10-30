import type { DailyPoint, HourlyPoint, Place, WeatherReport } from "./weather";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

type RawForecast = {
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    is_day: number;
    precipitation: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m: number;
    visibility: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
    daylight_duration: number[];
  };
};

type RawGeocode = {
  results?: Array<{
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
  }>;
};

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "is_day",
      "precipitation",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "visibility",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "is_day",
      "uv_index",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_probability_max",
      "daylight_duration",
    ].join(","),
    timezone: "auto",
    forecast_days: "10",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  });

  const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 600 },
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Forecast request failed with status ${response.status}`);
  }

  return mapForecast((await response.json()) as RawForecast);
}

function mapForecast(raw: RawForecast): WeatherReport {
  if (!raw.current || !raw.hourly?.time || !raw.daily?.time) {
    throw new Error("Forecast response was incomplete");
  }

  const hourly: HourlyPoint[] = raw.hourly.time.map((time, index) => ({
    time,
    temperature: raw.hourly.temperature_2m[index],
    weatherCode: raw.hourly.weather_code[index],
    precipitationProbability: raw.hourly.precipitation_probability[index] ?? 0,
    isDay: raw.hourly.is_day[index] === 1,
    uvIndex: raw.hourly.uv_index[index] ?? 0,
  }));

  const daily: DailyPoint[] = raw.daily.time.map((date, index) => ({
    date,
    weatherCode: raw.daily.weather_code[index],
    max: raw.daily.temperature_2m_max[index],
    min: raw.daily.temperature_2m_min[index],
    sunrise: raw.daily.sunrise[index],
    sunset: raw.daily.sunset[index],
    uvMax: raw.daily.uv_index_max[index] ?? 0,
    precipitationProbability: raw.daily.precipitation_probability_max[index] ?? 0,
    daylightDuration: raw.daily.daylight_duration[index] ?? 0,
  }));

  return {
    timezone: raw.timezone,
    timezoneAbbreviation: raw.timezone_abbreviation,
    utcOffsetSeconds: raw.utc_offset_seconds,
    current: {
      time: raw.current.time,
      temperature: raw.current.temperature_2m,
      apparentTemperature: raw.current.apparent_temperature,
      humidity: raw.current.relative_humidity_2m,
      weatherCode: raw.current.weather_code,
      isDay: raw.current.is_day === 1,
      precipitation: raw.current.precipitation,
      cloudCover: raw.current.cloud_cover,
      pressure: raw.current.pressure_msl,
      windSpeed: raw.current.wind_speed_10m,
      windGust: raw.current.wind_gusts_10m,
      windDirection: raw.current.wind_direction_10m,
      visibility: raw.current.visibility,
    },
    hourly,
    daily,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    name: query,
    count: "7",
    language: "en",
    format: "json",
  });

  const response = await fetch(`${GEOCODE_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 86400 },
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const raw = (await response.json()) as RawGeocode;

  return (raw.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    admin1: result.admin1,
    country: result.country,
    countryCode: result.country_code,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<Place> {
  const fallback: Place = {
    name: "Current location",
    latitude,
    longitude,
  };

  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    localityLanguage: "en",
  });

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );

    if (!response.ok) return fallback;

    const raw = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    };

    const name = raw.city || raw.locality || raw.principalSubdivision;
    if (!name) return fallback;

    return {
      name,
      admin1: raw.principalSubdivision,
      country: raw.countryName,
      countryCode: raw.countryCode,
      latitude,
      longitude,
    };
  } catch {
    // Reverse geocoding only supplies a readable label, so a failure falls back to a generic one.
    return fallback;
  }
}
