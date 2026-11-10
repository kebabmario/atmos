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

const pct = (fraction: number) => `${Math.min(Math.max(fraction, 0), 1) * 100}%`;

export function DailyList({ days, currentTemperature, unit }: DailyListProps) {
  const coldest = Math.min(...days.map((day) => day.min));
  const warmest = Math.max(...days.map((day) => day.max));
  const span = Math.max(warmest - coldest, 1);
  const at = (value: number) => (value - coldest) / span;

  return (
    <ul className="rows">
      {days.map((day, index) => {
        const chance = day.precipitationProbability;

        return (
          <li key={day.date}>
            <span>
              <strong>{formatDayLabel(day.date, index).toLowerCase()}</strong>{" "}
              <span className="row-date">{Number(day.date.slice(8, 10))}</span>
            </span>

            <span className="row-desc">
              <span>{describeWeather(day.weatherCode).label.toLowerCase()}</span>
              {chance >= 1 ? (
                <span className={`rain${chance >= 25 ? " likely" : ""}`}>{chance}% rain</span>
              ) : null}
            </span>

            <span className="row-end">
              <span className="lo">{formatTemperatureValue(day.min, unit)}°</span>
              <svg className="range" aria-hidden="true">
                <line x1="0" x2="100%" y1="7" y2="7" />
                <line className="span" x1={pct(at(day.min))} x2={pct(at(day.max))} y1="7" y2="7" />
                {index === 0 ? <circle cx={pct(at(currentTemperature))} cy="7" r="4" /> : null}
              </svg>
              <strong className="hi">{formatTemperatureValue(day.max, unit)}°</strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
