import {
  formatHourLabel,
  formatTemperatureValue,
  windDirection,
  windReading,
  type CurrentConditions,
  type DailyPoint,
  type HourlyPoint,
  type TemperatureUnit,
} from "./weather";

function periodPhrase(time: string): string {
  const hour = Number(time.slice(11, 13));
  if (hour < 6) return "overnight";
  if (hour < 12) return "this morning";
  if (hour < 17) return "this afternoon";
  if (hour < 21) return "this evening";
  return "tonight";
}

type SummaryInput = {
  current: CurrentConditions;
  hours: HourlyPoint[];
  today: DailyPoint;
  unit: TemperatureUnit;
};

/**
 * A plain sentence or two about the day ahead, in the register of a written
 * forecast rather than a list of numbers.
 */
export function daySummary({ current, hours, today, unit }: SummaryInput): string {
  const upcoming = hours.slice(0, 12);
  const high = formatTemperatureValue(today.max, unit);
  const low = formatTemperatureValue(today.min, unit);

  const steady = upcoming.filter((hour) => hour.precipitationProbability >= 55);
  const possible = upcoming.filter((hour) => hour.precipitationProbability >= 25);

  let opening: string;
  if (steady.length > 0) {
    const first = steady[0];
    opening =
      upcoming.indexOf(first) === 0
        ? `Rain ${periodPhrase(first.time)}`
        : `Rain likely from ${formatHourLabel(first.time)}`;
  } else if (possible.length > 0) {
    opening = `A chance of rain ${periodPhrase(possible[0].time)}`;
  } else if (current.cloudCover >= 75) {
    opening = "Cloudy but dry";
  } else if (current.cloudCover >= 40) {
    opening = "A little cloud, no rain";
  } else {
    opening = "Clear and dry";
  }

  const first = `${opening}, with a high near ${high}° and an overnight low around ${low}°.`;

  const gust = windReading(current.windGust, unit);
  if (gust.value < 30 || current.windGust <= current.windSpeed * 1.4) return first;

  return `${first} Gusts up to ${gust.value} ${gust.unit} out of the ${windDirection(
    current.windDirection,
  )}.`;
}
