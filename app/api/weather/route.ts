import { fetchWeather, isValidCoordinate } from "@/lib/forecast";

export const revalidate = 600;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (!isValidCoordinate(latitude, longitude)) {
    return Response.json({ error: "Valid lat and lon are required" }, { status: 400 });
  }

  try {
    const report = await fetchWeather(latitude, longitude);
    return Response.json(report, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
    });
  } catch {
    return Response.json({ error: "Weather data is unavailable" }, { status: 502 });
  }
}
