"use client";

import { useEffect, useRef, useState } from "react";
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

const H = 232;
const MIN_W = 560;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 30;
const PAD_B = 26;
const INNER_H = H - PAD_T - PAD_B;
const BASELINE = PAD_T + INNER_H;

function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  // Catmull-Rom tangents: each point leans toward its neighbours, so the
  // curve flows through the hours instead of flattening at every one.
  const slope = (index: number) => {
    const before = points[Math.max(index - 1, 0)];
    const after = points[Math.min(index + 1, points.length - 1)];
    return (after[1] - before[1]) / (after[0] - before[0]);
  };

  let path = `M${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const third = (x1 - x0) / 3;
    path += ` C${x0 + third},${y0 + slope(index) * third} ${x1 - third},${
      y1 - slope(index + 1) * third
    } ${x1},${y1}`;
  }
  return path;
}

export function HourlyChart({ hours, unit }: HourlyChartProps) {
  // Drawn at the container's real width so labels stay 12px at any size.
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(Math.round(entry.contentRect.width), MIN_W));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  if (hours.length < 2) return null;

  const values = hours.map((hour) => celsiusTo(hour.temperature, unit));
  const floor = Math.floor(Math.min(...values) - 1);
  const ceiling = Math.ceil(Math.max(...values) + 1);
  const span = Math.max(ceiling - floor, 1);
  const middle = Math.round((floor + ceiling) / 2);

  const step = (width - PAD_L - PAD_R) / (hours.length - 1);
  const xOf = (index: number) => PAD_L + index * step;
  const yOf = (value: number) => PAD_T + INNER_H - ((value - floor) / span) * INNER_H;
  const line = smoothPath(values.map((value, index) => [xOf(index), yOf(value)]));

  // Night as shaded bands, split where daylight turns.
  const nights: Array<[number, number]> = [];
  hours.forEach((hour, index) => {
    if (hour.isDay) return;
    const last = nights[nights.length - 1];
    if (last && last[1] === index - 1) last[1] = index;
    else nights.push([index, index]);
  });
  const edge = (index: number) => Math.min(Math.max(xOf(index - 0.5), PAD_L), width - PAD_R);
  const turns = hours
    .map((hour, index) => ({ hour, index }))
    .filter(({ hour, index }) => index > 0 && hour.isDay !== hours[index - 1].isDay);

  const ticks = hours.map((_, index) => index).filter((index) => index % 6 === 0);
  const gridTicks = Array.from(new Set([floor, middle, ceiling]));

  return (
    <div ref={boxRef} className="chart">
      <svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label={`Temperature and chance of rain for the next ${hours.length} hours, night shaded`}
      >
        {nights.map(([from, to]) => (
          <rect
            key={`night-${from}`}
            className="chart-night"
            x={edge(from)}
            y={PAD_T - 18}
            width={edge(to + 1) - edge(from)}
            height={BASELINE - PAD_T + 18}
          />
        ))}

        {turns.map(({ hour, index }) => (
          <text key={`turn-${index}`} className="chart-turn" x={edge(index) + 6} y={PAD_T - 6}>
            {hour.isDay ? "sunrise" : "sunset"}
          </text>
        ))}

        {gridTicks.map((tick) => (
          <g key={`grid-${tick}`}>
            <line className="chart-grid" x1={PAD_L} y1={yOf(tick)} x2={width - PAD_R} y2={yOf(tick)} />
            <text className="chart-axis" x={PAD_L - 8} y={yOf(tick) + 4} textAnchor="end">
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
              className={`chart-bar${chance >= 45 ? " strong" : ""}`}
              x={xOf(index) - 4}
              y={BASELINE - height}
              width={8}
              height={height}
              rx={2}
            />
          );
        })}

        <path className="chart-line" d={line} />
        <circle className="chart-now" cx={xOf(0)} cy={yOf(values[0])} r={5.5} />

        {ticks.map((index) => (
          <text
            key={`value-${index}`}
            className="chart-value"
            x={xOf(index)}
            y={yOf(values[index]) - 12}
            textAnchor={index === 0 ? "start" : "middle"}
          >
            {Math.round(values[index])}°
          </text>
        ))}

        {ticks.map((index) => (
          <text
            key={`hour-${index}`}
            className="chart-axis"
            x={xOf(index)}
            y={H - 6}
            textAnchor={index === 0 ? "start" : "middle"}
          >
            {index === 0 ? "now" : formatHourLabel(hours[index].time).toLowerCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}
