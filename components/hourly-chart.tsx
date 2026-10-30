import {
  celsiusTo,
  formatHourLabel,
  type HourlyPoint,
  type TemperatureUnit,
} from "@/lib/weather";

type HourlyChartProps = {
  hours: HourlyPoint[];
  unit: TemperatureUnit;
};

const W = 620;
const H = 186;
const PAD_L = 30;
const PAD_R = 6;
const PAD_T = 22;
const PAD_B = 24;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;
const BASELINE = PAD_T + INNER_H;

function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const mid = (x0 + x1) / 2;
    path += ` C${mid},${y0} ${mid},${y1} ${x1},${y1}`;
  }
  return path;
}

export function HourlyChart({ hours, unit }: HourlyChartProps) {
  if (hours.length < 2) return null;

  const values = hours.map((hour) => celsiusTo(hour.temperature, unit));
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const floor = Math.floor(lowest - 1);
  const ceiling = Math.ceil(highest + 1);
  const span = Math.max(ceiling - floor, 1);
  const middle = Math.round((floor + ceiling) / 2);

  const step = INNER_W / (hours.length - 1);
  const xOf = (index: number) => PAD_L + index * step;
  const yOf = (value: number) => PAD_T + INNER_H - ((value - floor) / span) * INNER_H;

  const points = values.map((value, index) => [xOf(index), yOf(value)] as [number, number]);
  const line = smoothPath(points);
  const area = `${line} L${xOf(hours.length - 1)},${BASELINE} L${PAD_L},${BASELINE} Z`;

  const valueTicks = hours.map((_, index) => index).filter((index) => index % 6 === 0);
  const hourTicks = hours.map((_, index) => index).filter((index) => index % 6 === 0);
  const gridTicks = Array.from(new Set([floor, middle, ceiling]));

  return (
    <div className="no-scrollbar -mx-[18px] overflow-x-auto px-[18px] sm:-mx-7 sm:px-7">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[500px]"
        role="img"
        aria-label={`Temperature and chance of rain for the next ${hours.length} hours`}
      >
        <defs>
          <linearGradient id="hourly-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d1d1f" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#1d1d1f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridTicks.map((tick) => (
          <g key={`grid-${tick}`}>
            <line className="chart-grid" x1={PAD_L} y1={yOf(tick)} x2={W - PAD_R} y2={yOf(tick)} />
            <text className="chart-axis-label" x={PAD_L - 8} y={yOf(tick) + 3.5} textAnchor="end">
              {tick}°
            </text>
          </g>
        ))}

        {hours.map((hour, index) => {
          const chance = hour.precipitationProbability;
          if (chance < 8) return null;
          const height = (chance / 100) * INNER_H * 0.72;
          return (
            <rect
              key={`rain-${hour.time}`}
              className={chance >= 45 ? "chart-bar-strong" : "chart-bar"}
              x={xOf(index) - 4}
              y={BASELINE - height}
              width={8}
              height={height}
              rx={4}
            />
          );
        })}

        <path d={area} fill="url(#hourly-fill)" />
        <path className="chart-line" d={line} />

        <line
          className="chart-now"
          x1={xOf(0)}
          y1={PAD_T - 4}
          x2={xOf(0)}
          y2={BASELINE}
        />
        <circle className="chart-now-dot" cx={xOf(0)} cy={yOf(values[0])} r={3.6} />

        {valueTicks.map((index) => (
          <text
            key={`value-${index}`}
            className="chart-value-label"
            x={xOf(index)}
            y={yOf(values[index]) - 11}
            textAnchor={index === 0 ? "start" : "middle"}
          >
            {Math.round(values[index])}°
          </text>
        ))}

        {hourTicks.map((index) => (
          <text
            key={`hour-${index}`}
            className="chart-hour-label"
            x={xOf(index)}
            y={H - 7}
            textAnchor={index === 0 ? "start" : "middle"}
          >
            {index === 0 ? "now" : formatHourLabel(hours[index].time).toLowerCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}
