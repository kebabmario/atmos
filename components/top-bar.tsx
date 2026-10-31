"use client";

import { useEffect, useRef, useState } from "react";
import type { Place, TemperatureUnit } from "@/lib/weather";

type SearchFieldProps = {
  onSelect: (place: Place) => void;
  className?: string;
};

export function SearchField({ onSelect, className = "" }: SearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) return;

    queueMicrotask(() => setPending(true));

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { results?: Place[] };
        setResults(data.results ?? []);
        setActive(-1);
        setSearched(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function choose(place: Place) {
    onSelect(place);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearched(false);
    setActive(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const place = results[active] ?? results[0];
      if (place) choose(place);
    }
  }

  const showEmpty = searched && !pending && query.trim().length >= 2 && results.length === 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-baseline gap-2 border-b border-dotted border-[rgba(0,0,0,0.28)] pb-1 transition-colors duration-150 focus-within:border-solid focus-within:border-ink">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const val = event.target.value;
            setQuery(val);
            setOpen(true);
            if (val.trim().length < 2) {
              setResults([]);
              setPending(false);
              setSearched(false);
              setActive(-1);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="search a city"
          aria-label="Search for a city"
          role="combobox"
          aria-expanded={open && (results.length > 0 || showEmpty)}
          aria-controls="place-results"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `place-option-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none"
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setPending(false);
              setSearched(false);
              setActive(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="-mb-1 shrink-0 text-[15px] leading-none text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && (results.length > 0 || showEmpty) ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-[10px] border border-hairline bg-surface py-1 shadow-[0_20px_36px_-26px_rgba(0,0,0,0.45)] sm:w-[280px]">
          {showEmpty ? (
            <p className="px-3 py-2.5 text-[12.5px] text-muted">
              No places match “{query.trim()}”.
            </p>
          ) : null}
          <ul id="place-results" role="listbox" aria-label="Matching places">
            {results.map((place, index) => (
              <li key={`${place.id ?? `${place.latitude},${place.longitude}`}`} role="presentation">
                <button
                  type="button"
                  id={`place-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(place)}
                  className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left transition-colors duration-150 ${
                    index === active ? "bg-[rgba(0,0,0,0.045)]" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{place.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {[place.admin1, place.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </span>
                  {place.countryCode ? (
                    <span className="shrink-0 text-[11px] text-muted">{place.countryCode}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function LocateButton({
  onClick,
  busy,
  className = "",
}: {
  onClick: () => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Use my current location"
      title="Use my current location"
      className={`shrink-0 text-[13px] text-muted-strong transition-colors duration-150 hover:text-ink disabled:cursor-wait disabled:text-muted ${className}`}
    >
      {busy ? "locating…" : "use my location"}
    </button>
  );
}

export function UnitToggle({
  unit,
  onChange,
  className = "",
}: {
  unit: TemperatureUnit;
  onChange: (unit: TemperatureUnit) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Temperature unit"
      className={`flex shrink-0 items-baseline gap-2 text-[13px] ${className}`}
    >
      {(["c", "f"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={unit === option}
          className={`transition-colors duration-150 ${
            unit === option ? "font-bold text-ink" : "text-muted hover:text-ink"
          }`}
        >
          °{option}
        </button>
      ))}
    </div>
  );
}