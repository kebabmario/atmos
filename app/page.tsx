import { headers } from "next/headers";
import { WeatherApp } from "@/components/weather-app";
import { fetchWeather } from "@/lib/forecast";
import type { Place, TemperatureUnit } from "@/lib/weather";

const DEFAULT_PLACE: Place = {
  name: "San Francisco",
  admin1: "California",
  country: "United States",
  countryCode: "US",
  latitude: 37.7749,
  longitude: -122.4194,
};

export default async function Page() {
  const [requestHeaders, initialReport] = await Promise.all([
    headers(),
    fetchWeather(DEFAULT_PLACE.latitude, DEFAULT_PLACE.longitude).catch(() => null),
  ]);

  const language = requestHeaders.get("accept-language") ?? "";
  const defaultUnit: TemperatureUnit = /^\s*en-us/i.test(language) ? "f" : "c";

  return (
    <WeatherApp
      initialPlace={DEFAULT_PLACE}
      initialReport={initialReport}
      defaultUnit={defaultUnit}
    />
  );
}
