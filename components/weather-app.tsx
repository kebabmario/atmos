'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CurrentBlock } from '@/components/current-block';
import { DailyList } from '@/components/daily-list';
import { DetailList } from '@/components/detail-list';
import { HourlyChart } from '@/components/hourly-chart';
import { Logo } from '@/components/logo';
import { SkyCanvas } from '@/components/sky-canvas';
import { LocateButton, SearchField, UnitToggle } from '@/components/top-bar';
import { daySummary } from '@/lib/summary';
import { phaseOf, skyOf, themeFor } from '@/lib/theme';
import {
  currentMinutes,
  currentUvIndex,
  describeWeather,
  minutesSinceMidnight,
  formatLocalDate,
  formatLocalTime,
  upcomingHours,
  type Place,
  type TemperatureUnit,
  type WeatherReport,
} from '@/lib/weather';

const PLACE_KEY = 'weather.place';
const UNIT_KEY = 'weather.unit';

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Place;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number'
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

export function WeatherApp({
  initialPlace,
  initialReport,
  defaultUnit,
}: WeatherAppProps) {
  const [place, setPlace] = useState<Place>(initialPlace);
  const [report, setReport] = useState<WeatherReport | null>(initialReport);

  // Starts from the server default so hydration matches; the saved unit is restored on mount.
  const [unit, setUnit] = useState<TemperatureUnit>(defaultUnit);

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(
    initialReport ? 'idle' : 'loading'
  );
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // null on the server so the clock never hydrates mismatched
  const [now, setNow] = useState<number | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (next: Place) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(
        `/api/weather?lat=${next.latitude}&lon=${next.longitude}`,
        {
          cache: 'no-store',
        }
      );

      if (!response.ok) throw new Error('Forecast unavailable');

      const data = (await response.json()) as WeatherReport;
      if (requestRef.current !== requestId) return;

      setReport(data);
      setPlace(next);
      setStatus('idle');
    } catch {
      if (requestRef.current !== requestId) return;
      setStatus('error');
      setError('The forecast could not be loaded. Try again in a moment.');
    }
  }, []);

  useEffect(() => {
    const saved = readStoredPlace();
    let savedUnit: string | null = null;
    try {
      savedUnit = window.localStorage.getItem(UNIT_KEY);
    } catch {
      // Ignore unreadable storage.
    }

    // Defer the async state-updating loader out of the synchronous render cycle
    queueMicrotask(() => {
      if (savedUnit === 'c' || savedUnit === 'f') setUnit(savedUnit);
      if (saved && !samePlace(saved, initialPlace)) {
        void load(saved);
      } else if (!initialReport) {
        void load(initialPlace);
      }
    });
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSelect = useCallback(
    (next: Place) => {
      storePlace(next);
      void load(next);
    },
    [load]
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
      setStatus(report ? 'idle' : 'error');
      setError(
        'This browser does not share a location. Search for a city instead.'
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          let next: Place = { name: 'My location', latitude, longitude };

          try {
            const response = await fetch(
              `/api/locate?lat=${latitude}&lon=${longitude}`
            );
            if (response.ok) {
              const data = (await response.json()) as { place?: Place };
              if (data.place?.name)
                next = { ...data.place, latitude, longitude };
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
        setError('Location was not shared. Search for a city instead.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, [load, report]);

  const today = report?.daily[0];
  const uvIndex =
    report && today
      ? currentUvIndex(report.hourly, report.current.time, today.uvMax)
      : 0;
  const hours = report
    ? upcomingHours(report.hourly, report.current.time, 24)
    : [];
  const clockReady = now != null && report != null;
  const nowMinutes = clockReady ? currentMinutes(report.timezone) : null;
  const localTime = clockReady
    ? formatLocalTime(report.timezone).toLowerCase()
    : '';
  const localDate = clockReady
    ? formatLocalDate(report.timezone).toLowerCase()
    : '';
  const busy = status === 'loading';
  const theme =
    report && today
      ? themeFor(
          phaseOf(
            nowMinutes,
            minutesSinceMidnight(today.sunrise),
            minutesSinceMidnight(today.sunset),
            report.current.isDay
          ),
          skyOf(describeWeather(report.current.weatherCode).kind)
        )
      : null;

  const paper = theme?.vars["--paper"];
  useEffect(() => {
    if (!paper) return;
    // Overscroll and the mobile browser bar follow the sky too.
    document.documentElement.style.backgroundColor = paper;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
  }, [paper]);

  return (
    <div className="sky" style={theme?.vars as React.CSSProperties | undefined}>
      {report && theme ? (
        <SkyCanvas
          latitude={place.latitude}
          longitude={place.longitude}
          cloudCover={report.current.cloudCover}
          sky={theme.sky}
          windSpeed={report.current.windSpeed}
          windDirection={report.current.windDirection}
          dark={theme.dark}
          condition={describeWeather(report.current.weatherCode).kind}
          precipitation={report.current.precipitation}
        />
      ) : null}
      <div className="page">
        <header className="top">
          <p className="name">
          atmos
          <Logo />
        </p>
          <div className="controls">
            <SearchField onSelect={handleSelect} />
            <LocateButton onClick={handleLocate} busy={locating} />
            <UnitToggle unit={unit} onChange={handleUnitChange} />
          </div>
        </header>

        <main aria-busy={busy} className="flex flex-1 flex-col">
          {report && today ? (
            <div className="dim">
              <CurrentBlock
                place={place}
                current={report.current}
                today={today}
                unit={unit}
                summary={daySummary({
                  current: report.current,
                  hours,
                  today,
                  unit,
                })}
                status={status}
                localTime={localTime}
                localDate={localDate}
                nowMinutes={nowMinutes}
              />

              <section aria-labelledby="hourly-heading" className="hourly">
                <div className="list-head">
                  <h2 id="hourly-heading" className="list-title">
                    the next 24 hours
                  </h2>
                  <p className="list-note">
                    bars are the chance of rain, night is shaded
                  </p>
                </div>
                <HourlyChart hours={hours} unit={unit} />
              </section>

              <div className="cols">
                <section aria-labelledby="daily-heading">
                  <h2 id="daily-heading" className="list-title list-head">
                    ten days
                  </h2>
                  <DailyList
                    days={report.daily}
                    currentTemperature={report.current.temperature}
                    unit={unit}
                  />
                </section>

                <section aria-labelledby="details-heading">
                  <h2 id="details-heading" className="list-title list-head">
                    right now
                  </h2>
                  <DetailList
                    current={report.current}
                    today={today}
                    uvIndex={uvIndex}
                    unit={unit}
                  />
                  <p className="credit">
                    forecast from{' '}
                    <a
                      href="https://open-meteo.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open-Meteo
                    </a>
                    , times local to {place.name}
                    {report.timezoneAbbreviation
                      ? ` (${report.timezoneAbbreviation})`
                      : ''}
                    {theme
                      ? `. colors follow the sky there: ${theme.phase}, ${theme.sky === 'partly' ? 'partly cloudy' : theme.sky}`
                      : ''}
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <section className="state">
              {status === 'error' ? (
                <>
                  <p className="note-state">{error}</p>
                  <button
                    type="button"
                    onClick={() => void load(place)}
                    className="retry"
                  >
                    try again
                  </button>
                </>
              ) : (
                <p className="note-state" role="status">
                  loading the forecast…
                </p>
              )}
            </section>
          )}
        </main>

        <footer className="foot">
          <ul>
            <li>
              <a href="https://kebabmario.dev" target="_blank" rel="noreferrer">
                made by myrixx
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kebabmario/atmos"
                target="_blank"
                rel="noreferrer"
              >
                github
              </a>
            </li>
          </ul>
        </footer>

        {error && report ? (
          <div role="status" className="toast">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              dismiss
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
