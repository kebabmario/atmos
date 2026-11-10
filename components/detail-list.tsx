import {
  formatClock,
  formatDuration,
  formatTemperatureValue,
  humidityDescriptor,
  pressureDescriptor,
  pressureReading,
  uvDescriptor,
  visibilityDescriptor,
  visibilityReading,
  windDirection,
  windReading,
  type CurrentConditions,
  type DailyPoint,
  type TemperatureUnit,
} from "@/lib/weather";

type DetailListProps = {
  current: CurrentConditions;
  today: DailyPoint;
  uvIndex: number;
  unit: TemperatureUnit;
};

export function DetailList({ current, today, uvIndex, unit }: DetailListProps) {
  const wind = windReading(current.windSpeed, unit);
  const gusts = windReading(current.windGust, unit);
  const visibility = visibilityReading(current.visibility, unit);
  const pressure = pressureReading(current.pressure, unit);
  const uv = uvDescriptor(uvIndex);

  const rows: Array<{ label: string; value: string; note?: string }> = [
    {
      label: "feels like",
      value: `${formatTemperatureValue(current.apparentTemperature, unit)}°`,
    },
    {
      label: "humidity",
      value: `${Math.round(current.humidity)}%`,
      note: humidityDescriptor(current.humidity).toLowerCase(),
    },
    {
      label: "wind",
      value: `${wind.value} ${wind.unit}`,
      note: windDirection(current.windDirection),
    },
    {
      label: "gusts",
      value: `${gusts.value} ${gusts.unit}`,
    },
    {
      label: "uv index",
      value: uvIndex.toFixed(1),
      note: uv.label.toLowerCase(),
    },
    {
      label: "visibility",
      value: `${visibility.value} ${visibility.unit}`,
      note: visibilityDescriptor(current.visibility).toLowerCase(),
    },
    {
      label: "pressure",
      value: `${pressure.value} ${pressure.unit}`,
      note: pressureDescriptor(current.pressure).toLowerCase(),
    },
    {
      label: "cloud cover",
      value: `${Math.round(current.cloudCover)}%`,
    },
    { label: "sunrise", value: formatClock(today.sunrise) },
    { label: "sunset", value: formatClock(today.sunset) },
    {
      label: "rain this hour",
      value: `${current.precipitation.toFixed(1)} mm`,
    },
    { label: "daylight", value: formatDuration(today.daylightDuration) },
  ];

  return (
    <dl className="readings">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          {row.note ? <span className="note">{row.note}</span> : null}
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
