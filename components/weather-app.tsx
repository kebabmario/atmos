"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CurrentBlock } from "@/components/current-block";
import { DailyList } from "@/components/daily-list";
import { DetailList } from "@/components/detail-list";
import { HourlyChart } from "@/components/hourly-chart";
import { LocateButton, SearchField, UnitToggle } from "@/components/top-bar";
import { daySummary } from "@/lib/summary";
import { skyWash } from "@/lib/tint";
import {
  currentUvIndex,
  describeWeather,
  formatLocalDate,
  formatLocalTime,
  upcomingHours,
  type Place,
  type TemperatureUnit,
  type WeatherReport,
} from "@/lib/weather";

const PLACE_KEY = "weather.place";
const UNIT_KEY = "weather.unit";

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Place;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number"
  );
}

function samePlace(first: Place, second: Place): boolean {
  return (
    Math.abs(first.latitude - second.latitude) < 0.001 &&
    Math.abs(first.longitude - second.longitude) < 0.001
  );
}

function readStoredPlace(): Place | null {
  try {
    const raw = window.localStorage.getItem(PLACE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPlace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function storePlace(place: Place) {
  try {
    window.localStorage.setItem(PLACE_KEY, JSON.stringify(place));
  } catch {
    // Storage can be unavailable in private modes; the session still works without it.
  }
}

type WeatherAppProps = {
  initialPlace: Place;
  initialReport: WeatherReport | null;
  defaultUnit: TemperatureUnit;
};

export function WeatherApp({ initialPlace, initialReport, defaultUnit }: WeatherAppProps) {
  const [place, setPlace] = useState<Place>(initialPlace);
  const [report, setReport] = useState<WeatherReport | null>(initialReport);
  const [unit, setUnit] = useState<TemperatureUnit>(defaultUnit);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialReport ? "idle" : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [, setMinuteTick] = useState(0);
  const requestRef = useRef(0);

  const load = useCallback(async (next: Place) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(`/api/weather?lat=${next.latitude}&lon=${next.longitude}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Forecast unavailable");

      const data = (await response.json()) as WeatherReport;
      if (requestRef.current !== requestId) return;

      setReport(data);
      setPlace(next);
      setStatus("idle");
    } catch {
      if (requestRef.current !== requestId) return;
      setStatus("error");
      setError("The forecast could not be loaded. Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    try {
      const savedUnit = window.localStorage.getItem(UNIT_KEY);
      if (savedUnit === "c" || savedUnit === "f") setUnit(savedUnit);
    } catch {
      // Ignore unreadable storage.
    }

    const saved = readStoredPlace();
    if (saved && !samePlace(saved, initialPlace)) {
      void load(saved);
    } else if (!initialReport) {
      void load(initialPlace);
    }
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMinuteTick((tick) => tick + 1);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSelect = useCallback(
    (next: Place) => {
      storePlace(next);
      void load(next);
    },
    [load],
  );

  const handleUnitChange = useCallback((next: TemperatureUnit) => {
    setUnit(next);
    try {
      window.localStorage.setItem(UNIT_KEY, next);
    } catch {
      // Ignore unwritable storage.
    }
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus(report ? "idle" : "error");
      setError("This browser does not share a location. Search for a city instead.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          let next: Place = { name: "My location", latitude, longitude };

          try {
            const response = await fetch(`/api/locate?lat=${latitude}&lon=${longitude}`);
            if (response.ok) {
              const data = (await response.json()) as { place?: Place };
              if (data.place?.name) next = { ...data.place, latitude, longitude };
            }
          } catch {
            // Keep the generic label when reverse geocoding is unavailable.
          }

          storePlace(next);
          await load(next);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Location was not shared. Search for a city instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [load, report]);

  const condition = report ? describeWeather(report.current.weatherCode) : null;
  const today = report?.daily[0];
  const uvIndex =
    report && today ? currentUvIndex(report.hourly, report.current.time, today.uvMax) : 0;
  const hours = report ? upcomingHours(report.hourly, report.current.time, 24) : [];
  const localTime = report ? formatLocalTime(report.timezone) : "";
  const localDate = report ? formatLocalDate(report.timezone) : "";
  const busy = status === "loading";
  const wash =
    report && condition ? skyWash(condition.kind, report.current.isDay) : null;

  return (
    <>
      {wash ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: `radial-gradient(115% 85% at 100% -8%, ${wash.warm}, transparent 55%), radial-gradient(85% 65% at 93% 0, ${wash.cool}, transparent 60%)`,
          }}
        />
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-[640px] px-[18px] pb-16 sm:px-7">
        <header className="flex flex-wrap items-baseline gap-x-5 gap-y-3 pt-6">
          <span className="order-1 mr-auto text-[13px] font-bold tracking-[-0.01em] text-ink">
            atmos
          </span>
          <UnitToggle unit={unit} onChange={handleUnitChange} className="order-2 sm:order-4" />
          <span className="order-3 h-0 w-full basis-full sm:hidden" aria-hidden="true" />
          <SearchField
            onSelect={handleSelect}
            className="order-4 w-[168px] sm:order-2 sm:w-[150px]"
          />
          <LocateButton
            onClick={handleLocate}
            busy={locating}
            className="order-5 ml-auto sm:order-3 sm:ml-0"
          />
        </header>

        <main
          aria-busy={busy}
          className={`transition-opacity duration-200 ${busy && report ? "opacity-55" : ""}`}
        >
          {report && condition && today ? (
            <>
              <CurrentBlock
                place={place}
                current={report.current}
                today={today}
                unit={unit}
                localTime={localTime}
                localDate={localDate}
                status={status}
              />

              <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.8] text-muted-strong">
                {daySummary({ current: report.current, hours, today, unit })}
              </p>

              <section aria-labelledby="hourly-heading" className="mt-9 border-t border-hairline pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2
                    id="hourly-heading"
                    className="text-[13px] font-bold tracking-[-0.01em] text-ink"
                  >
                    the next 24 hours
                  </h2>
                  <p className="text-[11.5px] text-muted">bars are the chance of rain</p>
                </div>
                <div className="mt-3">
                  <HourlyChart hours={hours} unit={unit} />
                </div>
              </section>

              <section aria-labelledby="daily-heading" className="mt-9">
                <h2
                  id="daily-heading"
                  className="text-[13px] font-bold tracking-[-0.01em] text-ink"
                >
                  ten days
                </h2>
                <DailyList
                  days={report.daily}
                  currentTemperature={report.current.temperature}
                  unit={unit}
                />
              </section>

              <section aria-labelledby="details-heading" className="mt-9">
                <h2
                  id="details-heading"
                  className="text-[13px] font-bold tracking-[-0.01em] text-ink"
                >
                  right now
                </h2>
                <DetailList
                  current={report.current}
                  today={today}
                  uvIndex={uvIndex}
                  unit={unit}
                />
              </section>

              <footer className="mt-5 text-[11.5px] leading-[1.7] text-muted">
                <p>
                  Forecast from{" "}
                  <a
                    href="https://open-meteo.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-link hover:underline"
                  >
                    open-meteo
                  </a>
                  . Times are local to {place.name}
                  {report.timezoneAbbreviation ? ` (${report.timezoneAbbreviation})` : ""}.
                </p>
              </footer>
            </>
          ) : (
            <section className="flex min-h-[48vh] flex-col justify-center gap-3">
              {status === "error" ? (
                <>
                  <p className="max-w-[40ch] text-[13.5px] leading-[1.7] text-muted-strong">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => void load(place)}
                    className="self-start border-b border-ink pb-0.5 text-[13px] text-ink"
                  >
                    try again
                  </button>
                </>
              ) : (
                <p
                  className="text-[13px] text-muted transition-opacity"
                  role="status"
                >
                  loading the forecast…
                </p>
              )}
            </section>
          )}
        </main>
      </div>

      {error && report ? (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div
            role="status"
            className="flex items-center gap-4 rounded-[10px] border border-hairline bg-surface py-2 pl-3.5 pr-2 shadow-[0_18px_32px_-24px_rgba(0,0,0,0.5)]"
          >
            <span className="text-[12.5px] text-ink">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[12.5px] text-muted transition-colors hover:text-ink"
            >
              dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
