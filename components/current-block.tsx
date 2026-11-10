import {
  describeWeather,
  formatClock,
  formatTemperatureValue,
  minutesSinceMidnight,
  type CurrentConditions,
  type DailyPoint,
  type Place,
  type TemperatureUnit,
} from "@/lib/weather";

type CurrentBlockProps = {
  place: Place;
  current: CurrentConditions;
  today: DailyPoint;
  unit: TemperatureUnit;
  summary: string;
  status: "idle" | "loading" | "error";
  /** Local clock at the place; empty until the client knows it. */
  localTime: string;
  localDate: string;
  nowMinutes: number | null;
};

function daylightPhase(today: DailyPoint, now: number): string {
  if (now < minutesSinceMidnight(today.sunrise)) return `dark, sunrise at ${formatClock(today.sunrise)}`;
  if (now < minutesSinceMidnight(today.sunset)) return `light until ${formatClock(today.sunset)}`;
  return `dark since ${formatClock(today.sunset)}`;
}

export function CurrentBlock({
  place,
  current,
  today,
  unit,
  summary,
  status,
  localTime,
  localDate,
  nowMinutes,
}: CurrentBlockProps) {
  const condition = describeWeather(current.weatherCode);
  const region = [place.admin1, place.country].filter(Boolean).join(", ");
  const degrees = (value: number) => `${formatTemperatureValue(value, unit)}°`;
  const statusText =
    status === "loading"
      ? "updating"
      : status === "error"
        ? "could not update"
        : `observed at ${formatClock(current.time)}`;

  return (
    <section className="now" aria-label="Current conditions">
      <div className="now-place">
        <span className={`status ${status}`}>{statusText}</span>
        <h1 className="place">{place.name}</h1>
        <p className="meta">
          {[region, localDate, localTime].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="now-reading">
        <p className="temp">{degrees(current.temperature)}</p>
        <p className="now-detail">
          <strong>{condition.label.toLowerCase()}</strong>
          feels like {degrees(current.apparentTemperature)}, high {degrees(today.max)}, low{" "}
          {degrees(today.min)}
          {nowMinutes != null ? <span>{daylightPhase(today, nowMinutes)}</span> : null}
        </p>
      </div>

      <p className="lead">{summary}</p>
    </section>
  );
}
