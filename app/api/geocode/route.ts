import { searchPlaces } from "@/lib/forecast";

export const revalidate = 86400;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchPlaces(query);
    return Response.json({ results }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch {
    return Response.json({ results: [] }, { status: 502 });
  }
}
