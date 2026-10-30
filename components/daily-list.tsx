import {
  describeWeather,
  formatDayLabel,
  formatTemperatureValue,
  type DailyPoint,
  type TemperatureUnit,
} from "@/lib/weather";

type DailyListProps = {
  days: DailyPoint[];
  currentTemperature: number;
  unit: TemperatureUnit;
};

export function DailyList({ days, currentTemperature, unit }: DailyListProps) {
  const coldest = Math.min(...days.map((day) => day.min));
  const warmest = Math.max(...days.map((day) => day.max));
  const span = Math.max(warmest - coldest, 1);

  return (
    <div className="mt-3 border-t border-hairline">
      {days.map((day, index) => {
        const condition = describeWeather(day.weatherCode);
        const offset = ((day.min - coldest) / span) * 100;
        const width = ((day.max - day.min) / span) * 100;
        const now = Math.min(Math.max(((currentTemperature - coldest) / span) * 100, 0), 100);
        const chance = day.precipitationProbability;

        return (
          <div
            key={day.date}
            className="grid grid-cols-[minmax(44px,56px)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-hairline py-[10px] last:border-b-0 sm:gap-x-4"
          >
            <p className="flex items-baseline gap-1.5">
              <span className="text-[13.5px] font-bold text-ink">
                {formatDayLabel(day.date, index).toLowerCase()}
              </span>
              <span className="tnum text-[11px] text-muted">{Number(day.date.slice(8, 10))}</span>
            </p>

            <p className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[12.5px] text-muted-strong">
                {condition.label.toLowerCase()}
              </span>
              <span
                className={`tnum ml-auto shrink-0 text-[11.5px] ${
                  chance >= 25 ? "text-[#5f87ab]" : "text-muted-strong"
                }`}
                aria-label={`${chance}% chance of precipitation`}
              >
                {chance >= 1 ? `${chance}%` : ""}
              </span>
            </p>

            <p className="flex items-center gap-2.5">
              <span className="tnum w-[26px] shrink-0 text-right text-[12.5px] text-muted">
                {formatTemperatureValue(day.min, unit)}°
              </span>

              <span
                className="relative block h-[4px] w-[54px] shrink-0 rounded-full bg-[rgba(0,0,0,0.06)] sm:w-[104px]"
                aria-hidden="true"
              >
                <span
                  className={`absolute inset-y-0 rounded-full ${
                    index === 0 ? "bg-amber" : "bg-[#b9c6d4]"
                  }`}
                  style={{ left: `${offset}%`, width: `${Math.max(width, 6)}%` }}
                />
                {index === 0 ? (
                  <span
                    className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-paper bg-ink"
                    style={{ left: `${now}%` }}
                  />
                ) : null}
              </span>

              <span className="tnum w-[28px] shrink-0 text-[13.5px] font-bold text-ink">
                {formatTemperatureValue(day.max, unit)}°
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
