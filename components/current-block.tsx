import {
  describeWeather,
  formatTemperatureValue,
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
  localTime: string;
  localDate: string;
  status: "idle" | "loading" | "error";
};

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-muted">{label} </span>
      <span className="tnum font-semibold text-ink">{value}</span>
    </span>
  );
}

export function CurrentBlock({
  place,
  current,
  today,
  unit,
  localTime,
  localDate,
  status,
}: CurrentBlockProps) {
  const condition = describeWeather(current.weatherCode);
  const dot =
    status === "loading"
      ? "bg-amber animate-pulse"
      : status === "error"
        ? "bg-[#c7c7cc]"
        : "bg-live";

  return (
    <section aria-label="Current conditions" className="pt-9 sm:pt-11">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="min-w-0 text-[clamp(1.65rem,6.6vw,2.35rem)] font-medium leading-[1.1] tracking-[-0.028em] text-ink">
          <span className="align-middle">{place.name}</span>
          <span
            className={`ml-2 inline-block h-[8px] w-[8px] shrink-0 -translate-y-[0.06em] rounded-full align-middle ${dot}`}
            aria-hidden="true"
          />
        </h1>
        <p className="tnum shrink-0 font-mono text-[12px] leading-none lowercase text-muted">
          {localTime}
        </p>
      </div>

      <p className="mt-1 flex flex-wrap items-baseline gap-x-4 text-[12.5px] text-muted-strong">
        {place.admin1 || place.country ? (
          <span>{[place.admin1, place.country].filter(Boolean).join(", ")}</span>
        ) : null}
        <span className="lowercase">{localDate}</span>
      </p>

      <div className="mt-7 flex items-start gap-4 sm:gap-6">
        <p className="tnum text-[clamp(4.4rem,16.5vw,6.5rem)] font-medium leading-[0.88] tracking-[-0.045em] text-ink">
          {formatTemperatureValue(current.temperature, unit)}
          <span className="relative top-[0.26em] -ml-[0.04em] align-top text-[0.3em] tracking-normal">
            °
          </span>
        </p>

        <div className="pt-[0.4em]">
          <p className="text-[16px] font-bold leading-tight tracking-[-0.012em] text-ink">
            {condition.label.toLowerCase()}
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-[12.5px]">
            <Figure
              label="feels like"
              value={`${formatTemperatureValue(current.apparentTemperature, unit)}°`}
            />
            <Figure label="high" value={`${formatTemperatureValue(today.max, unit)}°`} />
            <Figure label="low" value={`${formatTemperatureValue(today.min, unit)}°`} />
          </p>
        </div>
      </div>
    </section>
  );
}
