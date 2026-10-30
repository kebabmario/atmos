import { isValidCoordinate, reverseGeocode } from "@/lib/forecast";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (!isValidCoordinate(latitude, longitude)) {
    return Response.json({ error: "Valid lat and lon are required" }, { status: 400 });
  }

  const place = await reverseGeocode(latitude, longitude);
  return Response.json({ place });
}
